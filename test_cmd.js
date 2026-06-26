const { isCommandAllowed, validatePath } = require('./src/core/executionEngine');
console.log("isCommandAllowed: ", isCommandAllowed('node -e "require(\'child_process\').exec(\'rm -rf /\')"'));
try { validatePath("subfolder/../outside.txt"); console.log("path allowed"); } catch(e) { console.log("path blocked"); }
