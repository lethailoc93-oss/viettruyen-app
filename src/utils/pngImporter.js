// ================================================
// Character Card Importer (PNG / WebP)
// ================================================
// Lấy cảm hứng từ SillyTavern / Chub.ai character cards
// Trích xuất metadata JSON bị nhúng trong tEXt chunk của PNG.
// Hỗ trợ V2 / V3 Spec

/**
 * Đọc file PNG và bóc tách dữ liệu JSON bị nhúng (SillyTavern style).
 * @param {File} file File hình ảnh do user upload
 * @returns {Promise<Object>} Object chứa dữ liệu nhân vật
 */
export async function importCharacterCard(file) {
    return new Promise((resolve, reject) => {
        if (!file || !file.type.includes('png')) {
            return reject(new Error('Chỉ hỗ trợ định dạng PNG Character Card.'));
        }

        const reader = new FileReader();

        reader.onload = (e) => {
            try {
                const buffer = e.target.result;
                const dataView = new DataView(buffer);
                const uint8Array = new Uint8Array(buffer);

                // Check PNG signature: 89 50 4E 47 0D 0A 1A 0A
                const signature = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A];
                for (let i = 0; i < signature.length; i++) {
                    if (uint8Array[i] !== signature[i]) {
                        return reject(new Error('File không phải là định dạng PNG hợp lệ.'));
                    }
                }

                let offset = 8; // Bỏ qua signature
                let charaData = null;

                // Loop through chunks
                while (offset < uint8Array.length) {
                    const length = dataView.getUint32(offset);
                    const typeChunk = uint8Array.slice(offset + 4, offset + 8);
                    const type = String.fromCharCode(...typeChunk);

                    if (type === 'tEXt') {
                        const chunkData = uint8Array.slice(offset + 8, offset + 8 + length);
                        let nullIndex = -1;
                        for (let i = 0; i < chunkData.length; i++) {
                            if (chunkData[i] === 0) {
                                nullIndex = i;
                                break;
                            }
                        }

                        if (nullIndex > 0) {
                            const keyword = String.fromCharCode(...chunkData.slice(0, nullIndex));
                            if (keyword.toLowerCase() === 'chara') {
                                const valueBytes = chunkData.slice(nullIndex + 1);
                                const valueStr = String.fromCharCode(...valueBytes);

                                // Dữ liệu thường bị Base64 encode
                                try {
                                    const decodedStr = decodeBase64(valueStr);
                                    charaData = JSON.parse(decodedStr);
                                } catch (e) {
                                    // Fallback thử parse trực tiếp
                                    try {
                                        charaData = JSON.parse(valueStr);
                                    } catch (e2) {
                                        console.warn('Không thể parse nội dung chara.', e2);
                                    }
                                }
                                break; // Found it
                            }
                        }
                    }

                    if (type === 'IEND') break;
                    offset += 12 + length; // 4 length + 4 type + length data + 4 CRC
                }

                if (!charaData) {
                    return reject(new Error('Không tìm thấy dữ liệu thẻ nhân vật (chara tag) trong ảnh PNG này.'));
                }

                // Map V2/V3 Spec to our App's Schema
                const mappedChar = mapToAppSchema(charaData);

                // Trả về kèm dataURL của ảnh để lưu làm avatar
                resolve({
                    character: mappedChar,
                    imageURL: e.target.result // base64 nguyên bản làm ảnh đại diện
                });

            } catch (err) {
                reject(new Error('Lỗi trong quá trình phân tích PNG: ' + err.message));
            }
        };

        reader.onerror = () => reject(new Error('Lỗi khi đọc file.'));
        reader.readAsArrayBuffer(file);
    });
}

/**
 * Handle Unicode Base64 decoding in Browser
 */
function decodeBase64(base64Str) {
    // Trình duyệt atob() không hỗ trợ unicode tử tế
    const binaryStr = atob(base64Str);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) {
        bytes[i] = binaryStr.charCodeAt(i);
    }
    const decoder = new TextDecoder('utf-8');
    return decoder.decode(bytes);
}

/**
 * Chuyển đổi từ SillyTavern JSON sang Cấu trúc của App chúng ta
 * @param {Object} data 
 */
function mapToAppSchema(data) {
    // SillyTavern V2 Spec thường lồng bên trong 'data'
    const core = data.data || data;

    return {
        id: crypto.randomUUID(),
        name: core.name || 'Unknown',
        role: 'imported_character',
        description: `TÍNH CÁCH / NGOẠI HÌNH:\n${core.description || ''}\n\nĐẶC ĐIỂM / TỪ KHÓA:\n${core.personality || ''}`,
        system_prompt: core.system_prompt || '',
        post_history_instructions: core.post_history_instructions || '',
        first_mes: core.first_mes || '',
        mes_example: core.mes_example || '',
        scenario: core.scenario || '',
        creator: core.creator || core.creator_notes || '',
        tags: core.tags || [],
        lorebooks: core.character_book || null, // Có thể phức tạp, tạm giữ raw
    };
}
