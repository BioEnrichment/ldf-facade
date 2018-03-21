
const BOUND = { bound: true }
const UNBOUND = { unbound: true }

const TOOBIG = { toobig: true }
const UNIMPLEMENTED = { unimplemented: true }

function isError(r) {

    return r === TOOBIG || r === UNIMPLEMENTED

}

module.exports = { BOUND, UNBOUND, TOOBIG, UNIMPLEMENTED, isError }

