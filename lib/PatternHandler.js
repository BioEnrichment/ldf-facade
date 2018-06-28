
var join = require('./join')
var pruneEmpties = require('./pruneEmpties')
var callHandler = require('./callHandler')

const { BOUND, UNBOUND, TOOBIG, UNIMPLEMENTED, isError } = require('./constants')

function PatternHandler(server, pattern) {

    var patterns = server.patterns
    var enumerators = server.enumerators

    const patternsAndDistances = patterns.map(
        (patternEntry) => ({
            pattern: patternEntry,
            distance: distance(pattern, patternEntry.pattern)
        })
    )

    patternsAndDistances.sort((a, b) => a.distance - b.distance)

    let trace = []

    trace.push('Trying to find matcher for pattern ' + JSON.stringify(pattern))

    for(let i = 0; i < patternsAndDistances.length; ++ i) {

        const closestPattern = patternsAndDistances[i].pattern
        const closestPatternDistance = patternsAndDistances[i].distance

        trace.push('Checking ' + JSON.stringify(closestPattern))

        if(closestPatternDistance === 0) {
            trace.push('Exact match, nothing to do!')
            return closestPattern
        }


        var handler = closestPattern.handler


        let failed = false

        for(let iSpo of [ 's', 'p', 'o' ]) {

            if(pattern[iSpo] !== UNBOUND && closestPattern.pattern[iSpo] === UNBOUND) {

                // The closest pattern provides U but we want B
                // Need to specialize

                trace.push('Specializing ' + iSpo)

                handler = limit(handler)
                handler = join(handler, specialize(iSpo, pattern[iSpo]))

            } else if(pattern[iSpo] === UNBOUND && closestPattern.pattern[iSpo] !== UNBOUND) {

                // The closest pattern provides B but we want U
                // Need to generalize

                if(enumerators[iSpo]) {
                    trace.push('Generalizing ' + iSpo)
                    handler = join(generalize(iSpo), handler)
                } else {
                    trace.push('Would need to generalize ' + iSpo + ' but no enumerator has been given')
                    failed = true
                    break
                }

            }

        }

        if(failed) {
            continue
        }

        return pruneEmpties(handler)

    }

    console.log(trace.join('\n'))

    return () => UNIMPLEMENTED


    function generalize(iSpo) {

        return async function(state, pattern) {

            let res = await enumerators[iSpo](state)

            if(isError(res)) {
                return res
            }

            if(!res) {
                res = {}
            }

            if(!res.values) {
                res.values = []
            }

            if(res.total === undefined) {
                res.total = 9999
            }

            if(!res.nextState) {
                res.nextState = null
            }

            let { values, nextState, total } = res

            let triples = values.map((value) => {
                let triple = { s: pattern.s, p: pattern.p, o: pattern.o }
                triple[iSpo] = value
                return triple
            })

            return { triples, nextState, total }
        }

    }

    function specialize(iSpo, v) {

        return async function(state, pattern) {

            console.log('check', pattern[iSpo], '=', v)

            if(pattern[iSpo] === v) {
                return { triples: [ pattern ], nextState: null, total: 1 }
            } else {
                return { triples: [], nextState: null, total: 1 }
            }

        }
    }

    function limit(handler) {

        return async function(state, pattern) {

            let ret = callHandler(handler, state, pattern)

            if(isError(ret)) {
                return ret
            }

            if(ret.total > server.opts.specializeLimit) {
                return TOOBIG
            }

            return ret
        }

    }

    function distance(pA, pB) {

        var d = 0

        for(let iSpo of [ 's', 'p', 'o' ]) {
            if(pA[iSpo] !== pB[iSpo]) {
                ++ d
            }
        }

        return d
    }

}

module.exports = PatternHandler


