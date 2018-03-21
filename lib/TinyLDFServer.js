
const express = require('express')
const morgan = require('morgan')

const crypto = require('crypto')

const TERMS = require('./terms')

const { BOUND, UNBOUND, TOOBIG, UNIMPLEMENTED, isError } = require('./constants')

const PatternHandler = require('./PatternHandler')

const { URL } = require('url')

const callHandler = require('./callHandler')

const tooBigMessage = 'results would be too large for this puny facade to handle'
const unimplementedMessage = 'answering this query would require a matcher which has not been implemented'

function fullURL(req) {
	return req.protocol + '://' + req.get('host') + req.originalUrl
}

function baseURL(req) {

    const url = new URL(fullURL(req))

    url.pathname = ''
    url.search = ''
    url.searchParams = ''

    return url.toString()

}

function TinyLDFServer(opts) {

	this.opts = opts || {}

    this.opts.specializeLimit = 1000


	this.states = Object.create(null)

    this.patterns = []
    this.enumerators = { s: null, p: null, o: null }


	this.app = express()

    this.app.use(morgan('combined'))

	this.app.get('/', async (req, res) => {

        res.header('content-type', 'application/n-quads')

        writeBoilerplate(opts, req, res, null)

        res.end()

    })

	this.app.get('/query*', async (req, res) => {

        res.header('content-type', 'application/n-quads')

		let { s, p, o } = req.query

        s = s || UNBOUND
        p = p || UNBOUND
        o = o || UNBOUND

        if(typeof(o) === 'string') {

            if(o[0] === '"') {

                let idx = o.indexOf('^^')

                if(idx !== -1) {

                    pattern.datatype = o.slice(idx + 2)
                    o = o.substr(0, idx)

                }

                o = JSON.parse(o)

            }
        }

        var pattern = { s, p, o }

        var handler = PatternHandler(this, pattern)

        if(!p) {
            res.status(500).send('no matcher for this pattern')
            return
        }

        let result = await callHandler(handler, null, pattern)

        if(isError(result)) {
            doErrorResponse(result, res)
            return
        }

        let { triples, nextState, total } = result

        console.log('got total', total)

        if(nextState) {
            var nextToken = this._generateToken()
            this.states[nextToken] = { state: nextState, handler, pattern, first: fullURL(req) }
        }

        triples.forEach((triple) => {
            console.log('==>', JSON.stringify(triple))
            writeTriple(res, triple)
        })

        writeBoilerplate(opts, req, res, {
            first: fullURL(req),
            cur: fullURL(req),
            next: nextToken ? baseURL(req) + 'token/' + nextToken : null,
            total: total
        })

        res.end()
    })

	this.app.get('/token/:token', async (req, res) => {

		let { token } = req.params

        var stateInfo = this.states[token]

        console.log(JSON.stringify(stateInfo, null, 2))

        if(!stateInfo) {
            res.status(500).send('bad state token')
            return
        }

        res.header('content-type', 'application/n-quads')

        var { state, handler, pattern, first } = stateInfo

        let result = await callHandler(handler, state, pattern)

        if(isError(result)) {
            doErrorResponse(result, res)
            return
        }

        let { triples, nextState, total } = result

        if(nextState && !state._tokenNext) {

            state._tokenNext = this._generateToken()
            this.states[state._tokenNext] = { handler, pattern, first, state: nextState }
        }

        triples.forEach((triple) => {
            console.log('==>', JSON.stringify(triple))
            writeTriple(res, triple)
        })

        writeBoilerplate(opts, req, res, {
            first: stateInfo.first,
            cur: fullURL(req),
            //prev: state._tokenPrev ? baseURL(req) + 'token/' + state._tokenPrev : null,
            next: state._tokenNext ? baseURL(req) + 'token/' + state._tokenNext : null,
            total: total
        })

        res.end()
	})

    function doErrorResponse(err, res) {

        if(err === TOOBIG) {
            res.status(500).send(tooBigMessage)
            return
        } else if(err === UNIMPLEMENTED) {
            res.status(501).send(unimplementedMessage)
            return
        } else {
            res.status(500).send(JSON.stringify(err))
            return
        }

    }
}

module.exports = TinyLDFServer

module.exports.BOUND = BOUND
module.exports.UNBOUND = UNBOUND
module.exports.TOOBIG = TOOBIG
module.exports.UNIMPLEMENTED = UNIMPLEMENTED


function writeTriple(res, triple) {

    //console.log('writeTriple', JSON.stringify(triple))

    if(triple.datatype) {

        if(triple.datatype === 'string') {
            res.write(uri(triple.s) + ' ' + uri(triple.p) + ' ' + JSON.stringify(triple.o))
        } else {
            res.write(uri(triple.s) + ' ' + uri(triple.p) + ' ' + JSON.stringify(triple.o) + '^^<' + triple.datatype + '>')
        }

    } else {
        res.write(uri(triple.s) + ' ' + uri(triple.p) + ' ' + uri(triple.o))
    }

    if(triple.g) {
        res.write(' ' + uri(triple.g) + ' .\n')
    } else {
        res.write(' .\n')
    }

    function uri(u) {
        if(u.indexOf('_:') === 0)
            return u
        else
            return '<' + u + '>'
    }
}


TinyLDFServer.prototype = {

	_generateToken: function _generateToken() {

		var token

		do {
			token = crypto.randomBytes(8).toString('hex').toLowerCase()
		} while(this.states[token] !== undefined)

		return token
	},

	listen: function listen() {
		console.log('LDFServer listen', JSON.stringify(arguments))
		return this.app.listen.apply(this.app, arguments)
	},

    pattern: function(pattern, handler) {

        this.patterns.push({ pattern, handler })

    },

    enumSubjects: function(enumSubjects) {
        this.enumerators.s = enumSubjects
    },

    enumPredicates: function(enumPredicates) {
        this.enumerators.p = enumPredicates
    },

    enumObjects: function(enumObjects) {
        this.enumerators.o = enumObjects
    }

}


function writeBoilerplate(opts, req, res, controls) {

    var base = baseURL(req)
    var url = fullURL(req)
    var graph = base + '#metadata'

    var uriLookupEndpoint = base + 'query{?s,p,o}'


    writeTriple(res, { g: graph, s: url, p: TERMS.a, o: TERMS.Hydra.Collection })
    writeTriple(res, { g: graph, s: url, p: TERMS.a, o: TERMS.Void.Dataset })
    writeTriple(res, { g: graph, s: url, p: TERMS.Void.uriLookupEndpoint, o: uriLookupEndpoint, datatype: 'string' })
    writeTriple(res, { g: graph, s: url, p: TERMS.Hydra.search, o: '_:triplePattern' })
    writeTriple(res, { g: graph, s: '_:triplePattern', p: TERMS.Hydra.template, o: uriLookupEndpoint, datatype: 'string' })
    writeTriple(res, { g: graph, s: '_:triplePattern', p: TERMS.Hydra.variableRepresentation, o: TERMS.Hydra.ExplicitRepresentation })
    writeTriple(res, { g: graph, s: '_:triplePattern', p: TERMS.Hydra.mapping, o: '_:subject' })
    writeTriple(res, { g: graph, s: '_:triplePattern', p: TERMS.Hydra.mapping, o: '_:predicate' })
    writeTriple(res, { g: graph, s: '_:triplePattern', p: TERMS.Hydra.mapping, o: '_:object' })
    writeTriple(res, { g: graph, s: '_:subject', p: TERMS.Hydra.property, o: TERMS.RDF.subject })
    writeTriple(res, { g: graph, s: '_:subject', p: TERMS.Hydra.variable, o: "s", datatype: 'string' })
    writeTriple(res, { g: graph, s: '_:predicate', p: TERMS.Hydra.property, o: TERMS.RDF.predicate })
    writeTriple(res, { g: graph, s: '_:predicate', p: TERMS.Hydra.variable, o: "p", datatype: 'string' })
    writeTriple(res, { g: graph, s: '_:object', p: TERMS.Hydra.property, o: TERMS.RDF.object })
    writeTriple(res, { g: graph, s: '_:object', p: TERMS.Hydra.variable, o: "o", datatype: 'string' })

    if(controls) {

        writeTriple(res, { g: graph, s: url, p: TERMS.Void.subset, o: url })
        writeTriple(res, { g: graph, s: url, p: TERMS.a, o: TERMS.Hydra.PartialCollectionView })

        writeTriple(res, { g: graph, s: url, p: TERMS.Hydra.totalItems, o: controls.total + '', datatype: 'http://www.w3.org/2001/XMLSchema#integer' })


        writeTriple(res, { g: graph, s: url, p: TERMS.Hydra.first, o: controls.first })


        if(controls.prev) {
            writeTriple(res, { g: graph, s: url, p: TERMS.Hydra.previous, o: controls.prev })
        }

        if(controls.next) {
            writeTriple(res, { g: graph, s: url, p: TERMS.Hydra.next, o: controls.next })
        }

    }

}


