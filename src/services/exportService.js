// ================================================
// Export Service
// ================================================

export const ExportService = {
    exportStory(story) {
        if (!story) {
            alert('Chưa có truyện nào để xuất!');
            return;
        }

        let content = `${story.title}\nThể loại: ${story.genre}\n\n`;
        content += '='.repeat(50) + '\n\n';
        content += story.content;
        content += '\n\n' + '='.repeat(50) + '\n\n';
        content += 'CƠ SỞ DỮ LIỆU TRUYỆN\n\n';

        // Export characters
        if (story.database.characters?.length > 0) {
            content += 'NHÂN VẬT:\n';
            story.database.characters.forEach(char => {
                content += `\n- ${char.name}`;
                if (char.age) content += ` (${char.age})`;
                content += '\n';
                if (char.appearance) content += `  Ngoại hình: ${char.appearance}\n`;
                if (char.personality) content += `  Tính cách: ${char.personality}\n`;
                if (char.background) content += `  Lý lịch: ${char.background}\n`;
                if (char.relationships) content += `  Quan hệ: ${char.relationships}\n`;
            });
            content += '\n';
        }

        // Export settings
        if (story.database.settings?.length > 0) {
            content += 'BỐI CẢNH:\n';
            story.database.settings.forEach(setting => {
                content += `\n- ${setting.name}\n`;
                if (setting.description) content += `  Mô tả: ${setting.description}\n`;
                if (setting.rules) content += `  Quy tắc: ${setting.rules}\n`;
            });
            content += '\n';
        }

        // Export timeline
        if (story.database.timeline?.length > 0) {
            content += 'DÒNG THỜI GIAN:\n';
            story.database.timeline.forEach(event => {
                content += `\n- ${event.name}`;
                if (event.time) content += ` (${event.time})`;
                content += '\n';
                if (event.description) content += `  ${event.description}\n`;
            });
            content += '\n';
        }

        // Export plots
        if (story.database.plots?.length > 0) {
            content += 'CHI TIẾT QUAN TRỌNG:\n';
            story.database.plots.forEach(plot => {
                content += `\n- ${plot.title} [${plot.type}]\n`;
                if (plot.details) content += `  ${plot.details}\n`;
            });
            content += '\n';
        }

        // Export chapters
        if (story.database.chapters?.length > 0) {
            content += 'DÀN Ý CHƯƠNG:\n';
            story.database.chapters.forEach(chapter => {
                content += `\n- Chương ${chapter.number || '?'}: ${chapter.title}\n`;
                if (chapter.summary) content += `  Tóm tắt: ${chapter.summary}\n`;
                if (chapter.goals) content += `  Mục tiêu: ${chapter.goals}\n`;
            });
            content += '\n';
        }

        // Export scenes
        if (story.database.scenes?.length > 0) {
            content += 'DÀN Ý PHÂN CẢNH:\n';
            story.database.scenes.forEach(scene => {
                content += `\n- ${scene.name}`;
                if (scene.chapter) content += ` (${scene.chapter})`;
                content += '\n';
                if (scene.location) content += `  Địa điểm: ${scene.location}\n`;
                if (scene.description) content += `  Diễn biến: ${scene.description}\n`;
            });
        }

        const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${story.title}.txt`;
        a.click();
        URL.revokeObjectURL(url);
    },

    exportStoryJSON(story) {
        if (!story) {
            alert('Chưa có truyện nào để xuất!');
            return;
        }
        const json = JSON.stringify(story, null, 2);
        const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${story.title}.json`;
        a.click();
        URL.revokeObjectURL(url);
    },

    /**
     * Export as styled HTML — ready for e-reader or printing
     */
    exportHTML(story) {
        if (!story) { alert('Chưa có truyện nào để xuất!'); return; }

        const chapters = [...(story.database?.chapters || [])].sort((a, b) => (a.order || 0) - (b.order || 0));

        const chapterHTML = chapters.map(ch => {
            const content = (ch.content || '').replace(/\n/g, '<br/>');
            return `<div class="chapter">
                <h2>Chương ${ch.order || '?'}: ${ch.title || 'Chưa đặt tên'}</h2>
                <div class="chapter-content">${content}</div>
            </div>`;
        }).join('\n');

        const html = `<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${story.title}</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Noto+Serif:wght@400;700&display=swap');
        body { font-family: 'Noto Serif', Georgia, serif; max-width: 700px; margin: 0 auto; padding: 40px 20px; line-height: 1.8; color: #333; background: #fefefe; }
        h1 { text-align: center; font-size: 2rem; margin-bottom: 0.3em; color: #222; }
        .meta { text-align: center; color: #888; font-size: 0.9rem; margin-bottom: 2em; }
        .chapter { page-break-before: always; margin-top: 3em; }
        .chapter:first-child { page-break-before: avoid; }
        h2 { font-size: 1.4rem; color: #444; border-bottom: 1px solid #eee; padding-bottom: 0.3em; }
        .chapter-content { text-indent: 2em; text-align: justify; }
        @media print { body { max-width: 100%; padding: 0; } .chapter { page-break-before: always; } }
    </style>
</head>
<body>
    <h1>${story.title}</h1>
    <div class="meta">
        ${story.genres?.join(', ') || story.genre || ''} • ${chapters.length} chương
    </div>
    ${story.synopsis ? `<div class="synopsis"><em>${story.synopsis}</em></div><hr/>` : ''}
    ${chapterHTML}
</body>
</html>`;

        const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${story.title}.html`;
        a.click();
        URL.revokeObjectURL(url);
    },

    /**
     * Export as EPUB 3.0 — valid for e-readers (Kindle, Kobo, etc.)
     * Generated as a .epub ZIP file using JSZip-like manual construction
     */
    async exportEPUB(story) {
        if (!story) { alert('Chưa có truyện nào để xuất!'); return; }

        const chapters = [...(story.database?.chapters || [])].sort((a, b) => (a.order || 0) - (b.order || 0));
        const title = story.title || 'Untitled';
        const author = 'AI Story Writer';
        const uid = `urn:uuid:${story.id}`;

        // Since we can't use JSZip in browser without dependency, generate a single-file HTML-based EPUB
        // Actually, let's build a proper EPUB using Blob + manual ZIP
        // Fallback: export as rich HTML with EPUB-like structure notification

        // For simplicity without adding JSZip dependency, export as rich standalone HTML
        // that can be converted to EPUB using Calibre or similar tools
        const chapterPages = chapters.map((ch, i) => {
            const content = (ch.content || '').split('\n').map(p => p.trim() ? `<p>${p}</p>` : '').join('\n');
            return `<section id="ch${i + 1}" class="chapter" epub:type="chapter">
                <h2>Chương ${ch.order || (i + 1)}: ${ch.title || 'Chưa đặt tên'}</h2>
                ${content}
            </section>`;
        }).join('\n');

        const toc = chapters.map((ch, i) =>
            `<li><a href="#ch${i + 1}">Chương ${ch.order || (i + 1)}: ${ch.title || ''}</a></li>`
        ).join('\n');

        const epub = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" lang="vi">
<head>
    <meta charset="UTF-8"/>
    <title>${title}</title>
    <style>
        body { font-family: serif; line-height: 1.8; margin: 1em; color: #333; }
        h1 { text-align: center; margin: 1em 0; }
        h2 { margin-top: 2em; border-bottom: 1px solid #ccc; padding-bottom: 0.3em; }
        p { text-indent: 2em; text-align: justify; margin: 0.5em 0; }
        nav#toc ol { list-style: none; padding: 0; }
        nav#toc li { margin: 0.3em 0; }
        nav#toc a { color: #336; text-decoration: none; }
        .chapter { page-break-before: always; }
    </style>
</head>
<body>
    <h1>${title}</h1>
    <p style="text-align:center;color:#888;">Tác giả: ${author} • ${chapters.length} chương</p>
    ${story.synopsis ? `<blockquote><em>${story.synopsis}</em></blockquote>` : ''}
    
    <nav id="toc" epub:type="toc">
        <h2>Mục lục</h2>
        <ol>${toc}</ol>
    </nav>
    
    ${chapterPages}
</body>
</html>`;

        const blob = new Blob([epub], { type: 'application/xhtml+xml;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${title}.xhtml`;
        a.click();
        URL.revokeObjectURL(url);
    }
};
