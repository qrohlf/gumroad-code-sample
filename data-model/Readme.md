# Data Model Question

## Prompt:

> Let's design a small part of Gumroad. Gumroad helps creators sell their products online. As part of that we charge the buyers' credit cards and deposit money to the sellers' accounts. Here's a simplified version of our data model:
>
> Seller <1----_> Product <1----_> Purchase
>
> Each seller can have multiple products, and each product can have multiple purchases. Every purchase should increase the seller's balance. The seller can at any time refund a purchase, which should decrease his/her balance.
>
> We want to pay the sellers every other week for all their sales up to a week before that. For instance we would pay the sellers on Friday the 10th for all their sales up to Friday the 3rd. We want to have the flexibility to change this schedule; we might want to pay the sellers once a week instead of every other week.
>
> How would you design the data model that would support these requirements? Feel free to use a drawing tool to sketch out your design but please explain the rationale behind your design and how it would support:
>
> - purchases and refunds increasing and decreasing the balances
> - rolling payouts as described above
>
> Imagine the number of sellers and products will be in the millions, and the number of purchases will be in the hundreds of millions. Describe the indexes that you will add to the different tables/collections.
>
> We use ActiveRecord and MySQL, but your answer doesn't have to.

## First, a disclaimer

I've worked with backend systems at scale, but most of that work has been either application performance/event data (New Relic) or geospatial data (Ride with GPS, Scout Maps). I haven't worked with financial data much, and I went out of my way when I was building the backend for http://trianglify.io to ensure that Stripe would handle all of the payment stuff. I also was never responsible for tuning databases in terms of indexes, so while I'm _familiar_ with database performance concerns, it's not a core competency.

Basically, if I'm making a sticks-out-like-a-sore-thumb rookie mistake related to the _financial_ side of this like using floats for money or something equally facepalm-worthy, just know that it's likely due to my lack of domain knowledge in that specific area which is easily corrected if that ends up being a core responsibility for me in the future.

## Top-level models and tables

The probem statement lays out three top-level entities: `Seller`, `Product`, and `Purchase`.

It also describes a few actions that probably deserve their own models: `Refund` and `Payout`

Finally, the presence of a `Seller` also implies a `Buyer`. These are probably both best represented by a `User` entity, so they can live in the same table!

That gives us five models/tables to work with. I'd like to introduce a sixth, as well: `Transaction`

A `Transaction` record is anything that impacts a Seller's balance. This is also a nice place to store things like external payment processor transaction ids, track credit card authorization failures, etc etc. Any top-level entity that represents a change in a Seller's balance (so, `Purchase`, `Refund`, and `Payout`) will `has_one :transaction` (to use the AR parlance). Technically, you could accomplish similar functionality without an extra table using mixins and ActiveRecord polymorphism, but in my experience the queries get way messier and harder to optimize, and AR polymorphism is a bit of a footgun.

## Table schema

Let's talk schema (in pseudocode)!

### `users` table (for both Sellers and Buyers)

```sh
- id
- timestamps
- email, displayname, password, all the fun User stuff
# (note that if we support buying without creating an account, extra care is required here
# to make sure that anonymous user records don't blow things up.)
- has_many :transactions
- has_many :products
- has_many :purchases
- has_many :payouts
```

indexes - you'll want the usual indexes on email, displayname, and whatever else
you use to locate users, @mention them, whatever.

### `transactions` table (for tracking anything that impacts a user's balance)

```sh
- id
- timestamps
# transaction amount, in US Cents. Positive is a credit, negative is a debit.
- amount: integer NOT NULL
# user that this balance is impacting
- user_id: foreign key users.id NOT NULL
# any kind of metadata you get from your payment processor can get stored here too!
- stripe_transaction_id: string
# if this is an internal CREDIT transaction (positive amount) on a seller's
# account, it will have a corresponding DEBIT transaction (negative amount) on
# the buyer's account. It's not necessary to keep track of this pairing for
# balance computation, but it's still a good idea.
#
# note that this field is nullable - if this is an external transaction like
# a payout, it won't have a corresponding paired transaction within our system.
- paired_transaction_id: foreign key transactions.id
```

indexes - user_id

### `products` table

```sh
- id
- timestamps
- name: string NOT NULL
- ...all the other fun bits needed to render a product listing
# product price, in US Cents
- price: integer NOT NULL
# id of the seller
- seller_id: foreign key users.id NOT NULL
```

### `purchases` table

```sh
- id
- timestamps
- transaction_id: foreign key transactions.id NOT NULL
- product_id: foreign key products.id NOT NULL
- buyer_id: foreign key users.id NOT NULL
# I don't exactly remember the activerecord syntax, but you can get
# the seller here by using products as a join table.
- has_one :seller, through: [:products, :seller_id]
```

indexes - buyer_id, product_id, transaction_id

### `refunds` table

```sh
- id
- timestamps
- transaction_id: foreign key transactions.id NOT NULL
- purchase_id: foreign key products.id NOT NULL
# I don't exactly remember the activerecord syntax, but you can get
# the seller and buyer here by using products as a join table.
- has_one :seller, through: [:products, :seller_id]
- has_one :buyer, through: [:purchases, :buyer_id]
```

indexes - purchase_id, transaction_id

### `payouts` table

```sh
- id
- timestamps
- transaction_id: foreign key transactions.id NOT NULL
- seller_id: foreign key users.id NOT NULL
```

indexes - purchase_id, transaction_id

## Operations

Whew, that was a lot. So, to summarize in plain english - we've got a way to keep track of sellers & buyers through our `users` table. We've got a way to keep track of transactions where money moves around through the transactions table. And then we've got a way to keep track of all of these objects and actions that generate transactions through the `products`, `purchase`, `refunds`, and `payouts` tables.

### Purchases

So, how do we do a purchase? This one is pretty simple, we just create a Purchase that keeps track of the product_id, buyer_id, transaction_id, and a Transaction in the amount of +Product.price in the seller's account. This logic should all live in the `Purchase.rb` model.

### Refunds

Doing a refund is basically the same as a purchase, exact that we're going to reference a purchase_id instead of a product_id, and the Transaction that's generated for the Seller will have an amount of -Purchase.transaction.amount. (It's important to note that this should NOT be read from the Product.price. If the buyer uses a coupon or the product price has changed since the original purchase, we want to be sure to only refund the actual original purchase amount)

### Getting the balance, and payouts

With this schema, getting the user's balance is really easy:

```sql
SELECT sum(amount) FROM transactions WHERE transactions.user_id = $SELLER_ID
```

So creating a payout is also pretty simple:

(pseudo-code):

```
outstanding_balance = user.get_balance()
Payout.create({user: user, amount: outstanding_balance})
Transaction.create({user: user, amount: -outstanding_balance})
# in an application, you'd want to use your ORM to make sure that these things
# are coupled, and ideally that these happen in the same database transaction.
```

Since creating a payout will zero out the user's balance, you can make the
balance-generating query less taxing by only looking at transactions after the last payout:

```sql
SELECT sum(amount) FROM transactions WHERE transactions.user_id = $SELLER_ID AND transactions.created_at > $LAST_PAYOUT_DATE
```

### Bonus stuff

This schema lets you do things like see per-product balances though a join, which is helpful if you, say, wanted to show a pie chart for each payout seeing how much of the payout came from each of the seller's product.
