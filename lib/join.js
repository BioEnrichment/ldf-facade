
const callHandler = require('./callHandler')

const assert = require('assert')
const ImmutableArrayIterator = require('./ImmutableArrayIterator')

const { isError } = require('./constants')

var n = 0


function join(outer, inner) {

    return async function(state, pattern) {

        if(!state) {
            state = {
                nextOuterState: null,
                outerTripleIter: null,
                nextInnerState: null,
                total: 0
            }
        }

        let {
            nextOuterState,
            outerTripleIter,
            nextInnerState,
            total
        } = state

        let outerTotal = 0

        while(!outerTripleIter) {

            let outerResult = await callHandler(outer, nextOuterState, pattern)

            if(isError(outerResult))
                return outerResult

            nextOuterState = outerResult.nextState
            outerTripleIter = ImmutableArrayIterator(outerResult.triples, 0)

            outerTotal = Math.max(outerTotal, outerResult.total)
            total = Math.max(total, outerTotal)

            if(!outerTripleIter && !nextOuterState) {
                return {
                    triples: [],
                    total,
                    nextState: null
                }
            }

        }

        let innerResult = await callHandler(inner, nextInnerState, outerTripleIter.val)

        if(isError(innerResult))
            return innerResult

        total = Math.max(total, outerTotal * innerResult.total)

        if(innerResult.nextState) {

            return {
                triples: innerResult.triples,
                total: total,
                nextState: {
                    nextOuterState,
                    outerTripleIter,
                    total,
                    nextInnerState: innerResult.nextState
                }
            }

        } else {

            let nextIter = outerTripleIter.next()

            if(nextIter) {

                return {
                    triples: innerResult.triples,
                    total,
                    nextState: {
                        nextOuterState,
                        outerTripleIter: nextIter,
                        total,
                        nextInnerState: null
                    }
                }

            } else if(nextOuterState) {

                return {
                    triples: innerResult.triples,
                    total: total,
                    nextState: {
                        nextOuterState,
                        outerTripleIter: null,
                        nextInnerState: null,
                        total,
                    }
                }

            } else {

                return {
                    triples: innerResult.triples,
                    total,
                    nextState: null
                }

            }

        }

    }
}

module.exports = join

