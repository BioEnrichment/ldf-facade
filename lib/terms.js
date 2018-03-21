

const rdf = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#'
const hydra = 'http://www.w3.org/ns/hydra/core#'
const _void = 'http://rdfs.org/ns/void#'

module.exports = {

	a: rdf + 'type',
	
	Hydra: {
        Collection: hydra + 'Collection',

        search: hydra + 'search',
        template: hydra + 'template',

        variableRepresentation: hydra + 'variableRepresentation',
        ExplicitRepresentation: hydra + 'ExplicitRepresentation',

        mapping: hydra + 'mapping',
        property: hydra + 'property',
        variable: hydra + 'variable',

        PartialCollectionView: hydra + 'PartialCollectionView',

        first: hydra + 'first',
        previous: hydra + 'previous',
        next: hydra + 'next',

        totalItems: hydra + 'totalItems'


	},

	Void: {
        Dataset: _void + 'Dataset',

        uriLookupEndpoint: _void + 'uriLookupEndpoint',

        subset: _void + 'subset'
	},

    RDF: {
        subject: rdf + 'subject',
        predicate: rdf + 'predicate',
        object: rdf + 'object'
    },

    RDFS: {
    }


}

