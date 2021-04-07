# Pivot

## Prompt

> If you're not familiar with the Gumroad overlay, you should be. It's pretty cool: [gumroad.com/widgets](http://gumroad.com/widgets)
>
> It's one line of HTML that includes some JavaScript that makes Gumroad links work inline on the page instead of sending the user to gumroad.com/l/...
>
> The way it works is pretty simple: it scans every link to a gumroad product on a page, and if they exist, turns them into inline popups using transparent iFrames. Implement your own version of this, that could also be included as a single JS file. It should be as performant as possible, and replicate as closely as possible Gumroad's functionality (i.e. It should look for links to Gumroad products, it should embed the Gumroad > products themselves too and allow purchase, etc).
>
> If you have time, please support:
>
> - Custom subdomains and domains for creators (e.g. sahil.gumroad.com/pencil, sahil.com/pencil)
> - Early-load pages upon hover
> - Read data-attrs of the anchor tags to show a button or not, make it embed or not, etc.
>
> If you have product feedback as well, we'd love to hear it!

## Solution

see widgets.js

## Running the solution

For convenience, this folder is deployed to https://gullible-tree.surge.sh/

Alternatively, if you'd like to run it locally:

```sh
cd widgets
yarn start
# browse to http://localhost:2001
```
