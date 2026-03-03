const fs = require('fs');

function readPNGTextChunks(buffer) {
    const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
    const chunks = {};

    let offset = 8;
    while (offset < buffer.byteLength) {
        const length = view.getUint32(offset);
        const typeBytes = new Uint8Array(buffer.buffer, buffer.byteOffset + offset + 4, 4);
        const type = String.fromCharCode(...typeBytes);

        if (type === 'tEXt') {
            const chunkData = new Uint8Array(buffer.buffer, buffer.byteOffset + offset + 8, length);
            let nullIndex = -1;
            for (let i = 0; i < chunkData.length; i++) {
                if (chunkData[i] === 0) { nullIndex = i; break; }
            }
            if (nullIndex > 0) {
                // Buffer.from is used in Node instead of TextDecoder for mixed encodings
                const keyword = Buffer.from(chunkData.slice(0, nullIndex)).toString('latin1');
                const valueBytes = chunkData.slice(nullIndex + 1);
                const base64Str = Buffer.from(valueBytes).toString('latin1');
                try {
                    // Try to decode base64
                    const binaryStr = atob(base64Str);
                    const bytes = new Uint8Array(binaryStr.length);
                    for (let i = 0; i < binaryStr.length; i++) {
                        bytes[i] = binaryStr.charCodeAt(i);
                    }
                    const jsonStr = new TextDecoder('utf-8').decode(bytes);
                    chunks[keyword] = JSON.parse(jsonStr);
                } catch (e) {
                    try {
                        const jsonStr = Buffer.from(base64Str, 'base64').toString('utf8');
                        chunks[keyword] = JSON.parse(jsonStr);
                    } catch (err2) {
                        chunks[keyword] = "[Unparseable Base64/JSON Data]";
                    }
                }
            }
        }

        if (type === 'IEND') break;
        offset += 12 + length;
    }
    return chunks;
}

try {
    const filePath = process.argv[2];
    const buffer = fs.readFileSync(filePath);

    const chunks = readPNGTextChunks(buffer);
    if (chunks['chara']) {
        console.log("=== CHARA V2 DATA ===");
        console.log(JSON.stringify(chunks['chara'], null, 2));
    }
    if (chunks['ccv3']) {
        console.log("=== CCV3 DATA ===");
        console.log(JSON.stringify(chunks['ccv3'], null, 2));
    }
    if (!chunks['chara'] && !chunks['ccv3']) {
        console.log("No Chara data found in PNG. Available chunks: " + Object.keys(chunks).join(', '));
    }

} catch (err) {
    console.error("Error reading: ", err.message);
}
