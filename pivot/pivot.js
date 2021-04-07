const { expect } = require('chai')
// Pivot solution:
//
// In order to find the pivot, we'll need to know the full sum (or two half-sums
// which is functionally the same thing). In order to find the full sum, we
// need to visit every element. So right there that sets a lower bound of O(n),
// which is nice because it means I have zero reason to do anything fancy
const findPivot = (arr) => {
  if (!(arr && arr instanceof Array && arr.length > 0)) {
    return -1
  }
  const sum = arr.reduce((subtotal, elem) => subtotal + elem)

  let leftSum = 0
  for (let i = 0; i < arr.length; i++) {
    if (leftSum === (sum - arr[i]) / 2) {
      return i
    }
    leftSum += arr[i]
  }
  return -1
}

describe('findPivot', () => {
  it('should return the correct answer for the example provided in the prompt', () => {
    expect(findPivot([1, 4, 6, 3, 2])).to.equal(2)
  })

  it('should return the pivot for a few more examples I came up with', () => {
    expect(findPivot([7, 3, 2, 1, 1, 1, 1, 1])).to.equal(1)
    expect(findPivot([4, 4, 4, 4, 4, 4, 4])).to.equal(3)
    expect(findPivot([9, 7, 5, 3, 1])).to.equal(1)
    expect(findPivot([1, 2, 3, 4, 5, 6, 15])).to.equal(5)
  })

  it('handles 0', () => {
    expect(findPivot([0, 1])).to.equal(1)
    expect(findPivot([0, 0, 0, 0])).to.equal(0)
    expect(findPivot([1, 0, 0, 0])).to.equal(0)
  })

  it('should return -1 for some examples without a valid pivot', () => {
    expect(findPivot([1, 3, 4, 6])).to.equal(-1)
    expect(findPivot([1, 1, 1, 2, 2, 2])).to.equal(-1)
    expect(findPivot([4, 6, 1, 2, 8, 2])).to.equal(-1)
  })

  it('should return -1 when passed invalid input', () => {
    expect(findPivot([])).to.equal(-1)
    expect(findPivot(null)).to.equal(-1)
    expect(findPivot(' ')).to.equal(-1)
  })

  it('should return index 0 when given a single-element array', () => {
    expect(findPivot([1])).to.equal(0)
    expect(findPivot([3])).to.equal(0)
    expect(findPivot([5])).to.equal(0)
    expect(findPivot([7])).to.equal(0)
  })

  it('should handle cases where there is no pivot', () => {
    expect(findPivot([1, 4, 6, 7, 2])).to.equal(-1)
    expect(findPivot([1, 1, 2, 2, 1])).to.equal(-1)
  })

  it('handles negative numbers', () => {
    expect(findPivot([-1, -2, -1, -2, -1, 0])).to.equal(2)
  })
})
