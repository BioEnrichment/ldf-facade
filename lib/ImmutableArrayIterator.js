
function ImmutableArrayIterator(arr, i) {

    if(i >= arr.length)
        return null

    return {

        val: arr[i],

        next: () => {
            return i < arr.length - 1 ? ImmutableArrayIterator(arr, i + 1) : null
        }
    }

}

module.exports = ImmutableArrayIterator

