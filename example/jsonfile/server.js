

const LDFServer = require('../..')
const { BOUND, UNBOUND, TERMS } = require('../..')


const proteins = require(__dirname + '/dataset.json').proteins


const uriPrefix = 'http://example.com/uniprot/'


const server = new LDFServer({


})




server.enumSubjects(async (state) => {

    if(!state) {
        state = {
            i: 0
        }
    }

    var nextProtein = proteins[state.i]

    var s = uriPrefix + nextProtein.accession

    var nextIndex = state.i + 1

    if(nextIndex === proteins.length) {

        return { values: [ s ], total: proteins.length, nextState: null } 

    } else {

        var nextState = {
            i: nextIndex
        }

        return { values: [ s ], total: proteins.length, nextState: nextState } 

    }
})






// List all properties for a subject
//
server.pattern({

    s: BOUND,
    p: UNBOUND,
    o: UNBOUND

}, async (state, pattern) => {

    const subject = pattern.s

    if(subject.indexOf(uriPrefix) !== 0) {
        return { triples: [], total: 0, nextState: null }
    }

    const accession = subject.slice(uriPrefix.length)

    for(var protein of proteins) {

        if(protein.accession === accession) {

            var triples = [
                { s: subject, p: uriPrefix + 'name', o: protein.name, datatype: 'string' },
                { s: subject, p: uriPrefix + 'description', o: protein.description, datatype: 'string' },
                { s: subject, p: uriPrefix + 'accession', o: protein.accession, datatype: 'string' }
            ]

            return { triples: triples, total: 3, nextState: null }
        }

    }

    return { triples: [], total: 0, nextState: null }

})

server.listen(3000)






