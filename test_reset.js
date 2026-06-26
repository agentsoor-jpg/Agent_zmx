const ledger = require('./src/integrity/Ledger');
console.log("Before:", ledger.ledger.entries.length);
ledger.reset();
console.log("After:", ledger.ledger.entries.length);
