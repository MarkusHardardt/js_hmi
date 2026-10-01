import * as fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import xlsx from 'xlsx';
import main from '@markus.hardardt/js_utils/server/main.js';

let configFile = './config.json';
if (process.argv.length > 2 && /\.json$/.test(process.argv[2])) {
    configFile = /^\.\//.test(process.argv[2]) ? process.argv[2] : './' + process.argv[2];
}
const configPath = fileURLToPath(new URL(configFile, import.meta.url));
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
config.external = Object.freeze({
    fs,
    xlsx
});
config.postRequestHandler = { // TODO: Add handler if required
    sampleHandler: (request, onResponse, onError) => onResponse(`Sample handler response on request: '${request}'`)
};
main(config);