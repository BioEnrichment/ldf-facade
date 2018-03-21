
const { isError } = require('./constants')

async function callHandler(handler, state, pattern) {

    let res = await handler(state, pattern)

    if(isError(res)) {
        return res
    }

    if(!res) {
        res = {}
    }

    if(res.total === undefined) {
        res.total = 9999
    }

    if(!res.triples) {
        res.triples = []
    }

    if(!res.nextState) {
        res.nextState = null
    }

    return res

}

module.exports = callHandler

