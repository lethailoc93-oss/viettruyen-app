import { extractCharaFromPNG } from './src/utils/importExportUtils.js';
import fs from 'fs';

async function main() {
    try {
        const filePath = process.argv[2];
        const buffer = fs.readFileSync(filePath);

        // Mock a web File object structure for the function to work
        const file = {
            arrayBuffer: async () => buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength)
        };

        const chara = await extractCharaFromPNG(file);
        console.log(JSON.stringify(chara, null, 2));
    } catch (err) {
        console.error("Error:", err.message);
    }
}

main();
