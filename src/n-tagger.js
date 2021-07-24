const { Connection } = require('./mongo-connection');
const knownPrefixes = require('../assets/data/knownPrefixes');
const levenshtein = require('js-levenshtein');
const rp = require('request-promise');

const yapUri = 'http://localhost:8000/yap/heb/joint';

self = {

    getNext: async (req, res) => {
        let ref = await privateMethods.fetchNextReference();
        if (!ref) {
            res.status(400).send({msg: 'NO-MORE-EXAMPLES'});
        }

        let prefixes = privateMethods.generatePrefixCandidates(ref).map(x => privateMethods.convertToCandidateObj(x,ref,'prefixes'));
        let lemmatizer = (await privateMethods.generateLemCandidates(ref)).map(x => privateMethods.convertToCandidateObj(x,ref,'lemmatizer'));
        let w2v = (await privateMethods.fetchW2VCandidates(ref)).map(x => privateMethods.convertToCandidateObj(x,ref,'w2v'));

        let allSortedByLD = privateMethods.sortByLevenshtein(prefixes.concat(lemmatizer).concat(w2v))

        let ret = {
            reference: ref,
            top10: allSortedByLD.slice(0,10),
            prefixes: [],
            lemmatizer: [],
            w2v: []
        };


        for (let candidate of allSortedByLD) {
            ret[candidate.type].push(candidate);
        }

        res.status(200).send(ret);
    },

    updateRef: async (req, res) => {
        try {
            let ref = req.params.ref;
            let body = req.body;
    
            if (!ref || !body) {
                res.status(500).send();
                return;
            }
    
            let ret = await Connection.entitiesColl.updateOne({_id: ref}, { $set: {norm: body.value, type: body.type}});
    
            res.status(200).send({msg: 'updated.'});
        } catch (err) {
            console.log(error);
        }
    }


};

privateMethods = {
    fetchNextReference: async () => {
        // let ref = await Connection.entitiesColl.findOneAndUpdate({viewed: false}, { $set: { viewed: true}});
        let ref = await Connection.entitiesColl.findOne({norm: null}); 
        if (!ref) {
            return undefined;
        }
        return ref._id;
    },

    generatePrefixCandidates: (ref) => {
        let subTokens = ref.split('-');
        let candidateParts = [];

        for (let subToken of subTokens) {
            candidateParts.push(privateMethods.removeKnownPrefixes(subToken));
        }

        let candidates = privateMethods.allPermutations(candidateParts);
        // candidates = privateMethods.sortByLevenshtein(candidates, ref.value);

        return candidates;
    },

    generateLemCandidates: async (ref) => {
        let body = {
            text: `${ref}  `
        };

        let candidates = await rp({
            method: 'GET',
            uri: yapUri,
            body: body,
            json: true
        });

        candidates = candidates
                        .dep_tree
                        .split('\n')
                        .map(x => x.split('\t').length > 3 ? x.split('\t')[2] : '')
                        .filter(x => x !== '' && x.length > 1);

        return candidates;
    },

    fetchW2VCandidates: async (ref) => {
        let candidates = await Connection.n_w2vColl.findOne({'_id': ref});
        if (!candidates) {
            return [];
        }
        return candidates.sim;
    },

    removeKnownPrefixes: (token) => {
        let ret = [token];
        for (let prefix of knownPrefixes) {
            if (token.substring(0, prefix.length) === prefix) {
                ret.push(token.substring(prefix.length));
            }
        }
        return ret;
    },

    allPermutations: (parts) => {
        return parts.reduce((a, b) => a.reduce((r, v) => r.concat(b.map(w => [].concat(v, w))), [])).map(a => a.join('-'));
    },

    sortByLevenshtein: (arr) => {
        // Sorts the array according to the levenshtein distance to the reference, then alphabetically.
        return arr.sort((a, b) => {
            if (a.ld < b.ld) {
                return -1;
            } else if (a.ld > b.ld) {
                return 1;
            } else {
                if (a.value < b.value) {
                    return -1;
                } else if (a.value > b.value) {
                    return 1;
                } else {
                    return 0;
                }
            }
        });
    },

    convertToCandidateObj: (x, ref, type) => {
        return {
            value: x,
            type: type,
            ld: levenshtein(x, ref)
        };
    }

};

module.exports = self;