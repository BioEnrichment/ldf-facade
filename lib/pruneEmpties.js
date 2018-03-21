
const callHandler = require('./callHandler')

const { isError } = require('./constants')

function pruneEmpties(iterate) {

    return async function(state, pattern) {

        if(!state) {
            state = {
                nextState: null,
                nextTriples: null,
                total: 0
            }
        }

        let { nextState, nextTriples, total } = state


        if(!nextTriples) {

            for(;;) {

                let result = await callHandler(iterate, nextState, pattern)

                if(isError(result))
                    return result

                total = Math.max(total, result.total)

                nextState = result.nextState

                if(result.triples.length > 0) {
                    nextTriples = result.triples
                    break
                }

                if(!nextState) {

                    // end while looking for first triples
                    //
                    return { triples: [], total, nextState: null }
                }
            }
        }

        if(!nextState) {

            return { triples: nextTriples, total, nextState: null }

        }

        // so we have some triples and we have a nextState
        // what we don't know is if the nextState is going to give
        // us any triples


        for(;;) {

            let result = await callHandler(iterate, nextState, pattern)

            if(isError(result))
                return result

            total = Math.max(total, result.total)

            nextState = result.nextState

            if(result.triples.length > 0) {

                return {
                    triples: nextTriples,
                    total,

                    nextState: {
                        nextState: nextState,
                        nextTriples: result.triples,
                        total
                    }
                }

            }

            if(!nextState) {

                // end while looking for next triples
                //
                return { triples: nextTriples, total, nextState: null }
            }

        }

    }

}

module.exports = pruneEmpties


