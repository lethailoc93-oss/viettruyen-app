// ================================================
// Genre-Specific Writing Rules & Conventions
// Provides per-genre AI prompt instructions
// ================================================

/**
 * Map of genre keys → detailed writing rules in Vietnamese.
 * Each entry contains conventions, techniques, and dos/don'ts
 * that the AI must follow when writing in that genre.
 */
const GENRE_RULES = {
    romance: {
        label: 'Ngôn tình / Tình cảm',
        rules: `【QUY TẮC THỂ LOẠI: NGÔN TÌNH / TÌNH CẢM】
• NHỊP CẢM XÚC: Xây dựng tình cảm từ từ, tự nhiên — không yêu ngay từ cái nhìn đầu tiên (trừ khi tác giả yêu cầu). Phát triển qua các giai đoạn: tò mò → thu hút → đấu tranh nội tâm → thổ lộ.
• CHEMISTRY: Tạo "spark" giữa hai nhân vật qua ánh mắt, cử chỉ nhỏ, đối thoại có ẩn ý, sự va chạm tình cờ. Quan trọng hơn hành động là CẢM XÚC bên trong.
• ĐỐI THOẠI: Lời thoại phải có lớp nghĩa — nói một đằng, nghĩ một nẻo. Sử dụng im lặng, ngập ngừng, câu bỏ dở để tạo tension.
• MÔ TẢ CẢM XÚC: Miêu tả cảm xúc qua phản ứng cơ thể (tim đập, má nóng, tay run, hơi thở gấp) thay vì nói thẳng "anh yêu em".
• XÂY DỰNG CHƯỚNG NGẠI: Phải có chướng ngại vật cho tình yêu (gia đình phản đối, hiểu lầm, khoảng cách, bí mật) để tạo kịch tính.
• CẢM GIÁC LÃNG MẠN: Chú trọng mô tả bối cảnh lãng mạn (mưa, hoàng hôn, mùi hương, ánh trăng). Dùng ẩn dụ và so sánh tinh tế.
• TRÁNH: Quan hệ toxic được lý tưởng hóa, tình tiết sáo rỗng không có chiều sâu cảm xúc, nhân vật quá hoàn hảo.`
    },

    horror: {
        label: 'Kinh dị',
        rules: `【QUY TẮC THỂ LOẠI: KINH DỊ】
• XÂY TENSION: Tạo sợ hãi từ từ — bắt đầu bằng những chi tiết nhỏ bất thường, tăng dần cường độ. Sợ hãi TRƯỚC KHI thấy quái vật mạnh hơn SAU KHI thấy.
• SỢ HÃI TÂM LÝ: Ưu tiên nỗi sợ tâm lý hơn gore/máu me. Sử dụng: sự cô lập, hoang tưởng, mất kiểm soát, cái chết, bóng tối, sự im lặng bất thường.
• MÔ TẢ GIÁC QUAN: Đặc biệt chú ý âm thanh (tiếng bước chân, tiếng thì thầm, tiếng cào), mùi (mùi ẩm mốc, mùi tanh), xúc giác (hơi lạnh, hơi thở trên gáy). Giảm thị giác để tăng sự bất định.
• PACING: Xen kẽ đoạn chậm (tạo bầu không khí, false sense of security) với đoạn bùng nổ bất ngờ. Dùng câu ngắn, dứt khoát trong khoảnh khắc kinh hãi.
• NHÂN VẬT: Cho nhân vật phản ứng chân thực với nỗi sợ — run rẩy, phủ nhận, hoảng loạn, đóng băng. KHÔNG để nhân vật quá bình tĩnh trước siêu nhiên.
• BẦU KHÔNG KHÍ: Mô tả chi tiết bối cảnh tạo cảm giác bất an — bóng tối, không gian hẹp, sự vắng vẻ, thời tiết xấu, đồ vật cũ kỹ.
• GIỮ BÍ ẨN: Không giải thích hết mọi thứ. Để lại khoảng trống cho trí tưởng tượng, đó là nguồn gốc của nỗi sợ mạnh nhất.
• TRÁNH: Jumpscare rẻ tiền liên tục, giải thích siêu nhiên quá logic, nhân vật hành xử ngu ngốc chỉ để phục vụ cốt truyện.`
    },

    mystery: {
        label: 'Trinh thám / Bí ẩn',
        rules: `【QUY TẮC THỂ LOẠI: TRINH THÁM / BÍ ẨN】
• GIEO MANH MỐI (Fair Play): Mọi manh mối cần thiết phải được giới thiệu TRƯỚC khi phá án. Người đọc phải có cơ hội suy luận cùng nhân vật.
• RED HERRING: Xen vào 2-3 manh mối giả (red herring) để đánh lạc hướng, nhưng sau đó phải giải thích tại sao chúng không phải đáp án.
• NHỊP ĐIỀU TRA: Theo pattern: phát hiện bí ẩn → thu thập manh mối → giả thuyết → bị bác bỏ → manh mối mới → bước ngoặt → phá án.
• LOGIC CHẶT CHẼ: Kết luận phải dựa trên bằng chứng đã trình bày. KHÔNG dùng deus ex machina hoặc thông tin từ thinh không.
• NGHI PHẠM: Tạo ít nhất 3 nghi phạm với động cơ rõ ràng. Mỗi người đều có bí mật riêng, không nhất thiết liên quan đến vụ án chính.
• NHÂN VẬT THÁM TỬ: Thám tử phải có phương pháp suy luận riêng, có điểm yếu cá nhân, KHÔNG phải thiên tài hoàn hảo.
• TWIST: Cú twist phải bất ngờ nhưng khi nhìn lại, tất cả manh mối đều khớp. "Aha moment" là đỉnh cao của thể loại.
• TRÁNH: Giải đáp quá dễ, thủ phạm xuất hiện ở phút cuối không có foreshadowing, quá nhiều tình cờ hợp lý.`
    },

    scifi: {
        label: 'Khoa học viễn tưởng',
        rules: `【QUY TẮC THỂ LOẠI: KHOA HỌC VIỄN TƯỞNG】
• KHOA HỌC HỢP LÝ: Mọi công nghệ/hiện tượng phải có giải thích logic (dù là giả tưởng). Đặt ra quy tắc và tuân thủ nhất quán. Không dùng "vì khoa học" làm phép thuật.
• WORLDBUILDING CÔNG NGHỆ: Mô tả cách công nghệ ảnh hưởng đến xã hội, kinh tế, đạo đức, chiến tranh. Công nghệ phải có hệ quả, không chỉ là backdrop.
• CÂU HỎI TRIẾT HỌC: Đặt vấn đề sâu sắc — AI có ý thức không? Con người là gì khi cơ thể thay thế? Quyền lực tuyệt đối dẫn đến đâu?
• THUẬT NGỮ: Sử dụng thuật ngữ khoa học/kỹ thuật phù hợp nhưng giải thích tự nhiên qua ngữ cảnh, KHÔNG dump thông tin dài dòng.
• NGOẠI SUY: Từ xu hướng hiện tại, suy luận ra tương lai hợp lý. VD: biến đổi khí hậu → thành phố nổi, AI phát triển → xã hội giám sát.
• NHÂN VẬT: Con người (hoặc sinh vật có ý thức) vẫn là trung tâm. Công nghệ là bối cảnh, KHÔNG phải nhân vật chính.
• TRÁNH: Technobabble vô nghĩa, vi phạm quy tắc đã đặt ra, dùng công nghệ giải quyết mọi vấn đề quá dễ dàng (plot armor công nghệ).`
    },

    fantasy: {
        label: 'Giả tưởng / Fantasy',
        rules: `【QUY TẮC THỂ LOẠI: GIẢ TƯỞNG / FANTASY】
• HỆ THỐNG PHÉP THUẬT: Phép thuật PHẢI có quy tắc và giới hạn rõ ràng (Sanderson's Laws). Sức mạnh đi kèm cái giá, không có phép thuật toàn năng.
• WORLDBUILDING: Xây dựng thế giới sống động — lịch sử, văn hóa, tôn giáo, chính trị, sinh thái. Mỗi chi tiết phải phục vụ câu chuyện hoặc tạo chiều sâu.
• HÀNH TRÌNH ANH HÙNG: Theo cấu trúc kinh điển: Thế giới bình thường → Tiếng gọi → Từ chối → Mentor → Thử thách → Bóng tối sâu nhất → Phần thưởng → Trở về. Có thể biến tấu nhưng giữ khung sườn.
• CHỦNG TỘC & SINH VẬT: Nếu có chủng tộc/sinh vật huyền bí, phải có văn hóa, ngôn ngữ, tổ chức xã hội riêng. TRÁNH rập khuôn cliché (elf = đẹp lạnh lùng).
• MÔ TẢ: Giàu hình ảnh, hoành tráng khi cần, nhưng tránh over-description. Mỗi cảnh mô tả phải phục vụ cốt truyện hoặc cảm xúc.
• XUNG ĐỘT: Có cả xung đột bên ngoài (thiện vs ác) và bên trong (đạo đức, lựa chọn khó khăn). TRÁNH thiện/ác quá rõ ràng, tạo sắc thái xám.
• TRÁNH: Mary Sue/Gary Stu, power creep không kiểm soát, giải quyết vấn đề bằng phép thuật mới xuất hiện, info dump.`
    },

    adventure: {
        label: 'Phiêu lưu',
        rules: `【QUY TẮC THỂ LOẠI: PHIÊU LƯU】
• PACING NHANH: Nhịp truyện nhanh, liên tục có sự kiện mới. Mỗi chương phải có ít nhất 1 thử thách hoặc khám phá.
• ACTION: Viết cảnh hành động rõ ràng, sinh động — sử dụng câu ngắn, động từ mạnh, mô tả chuyển động. Tránh mơ hồ "họ đánh nhau".
• CLIFFHANGER: Kết thúc chương bằng cliffhanger hoặc hook để người đọc muốn đọc tiếp.
• NHÂN VẬT PHÁT TRIỂN: Nhân vật phải lớn lên qua mỗi thử thách — học kỹ năng mới, vượt qua nỗi sợ, thay đổi quan điểm.
• THẾ GIỚI RỘNG LỚN: Khám phá nhiều địa điểm khác nhau. Mỗi địa điểm có đặc trưng riêng về văn hóa, cảnh quan, nguy hiểm.
• STAKES: Rủi ro phải thật và leo thang. Nhân vật phải hy sinh, mất mát để đạt mục tiêu.
• TRÁNH: Nhân vật bất tử (plot armor quá dày), giải quyết quá dễ, thiếu mục tiêu rõ ràng.`
    },

    historical: {
        label: 'Lịch sử',
        rules: `【QUY TẮC THỂ LOẠI: LỊCH SỬ】
• CHÍNH XÁC LỊCH SỬ: Bối cảnh, sự kiện, phong tục phải đúng hoặc hợp lý với thời đại được mô tả. Nếu hư cấu, phải ghi chú rõ.
• NGÔN NGỮ PHÙ HỢP: Sử dụng ngôn ngữ phù hợp thời đại — cổ phong nếu cần, TRÁNH từ ngữ hiện đại lạc lõng (VD: "OK", "stress" trong bối cảnh cổ đại).
• BỐI CẢNH XÃ HỘI: Mô tả chi tiết cấu trúc xã hội, giai cấp, phong tục, tín ngưỡng, trang phục, ẩm thực phù hợp thời đại.
• NHÂN VẬT LỊCH SỬ: Nếu có nhân vật có thật, phải dựa trên thông tin lịch sử. Hư cấu hóa với sự tôn trọng.
• CHI TIẾT ĐỜI SỐNG: Mô tả sinh hoạt hàng ngày (ăn, mặc, đi lại, giao tiếp) đúng thời đại, tạo cảm giác "sống trong thời đó".
• CONFLICT: Xung đột dựa trên bối cảnh lịch sử (chiến tranh, chính trị, giai cấp, tôn giáo).
• TRÁNH: Anachronism (lỗi thời gian), áp đặt tư duy hiện đại lên nhân vật cổ đại, sai lệch lịch sử nghiêm trọng.`
    },

    slice_of_life: {
        label: 'Đời thường',
        rules: `【QUY TẮC THỂ LOẠI: ĐỜI THƯỜNG】
• TỰ NHIÊN: Mọi thứ phải chân thực, gần gũi. Không cần sự kiện hoành tráng — một bữa cơm gia đình, cuộc gặp tình cờ có thể là cả thế giới.
• CHI TIẾT NHỎ: Chú trọng chi tiết nhỏ nhưng ý nghĩa — cách pha cà phê, tiếng mưa rơi trên mái, nụ cười của người lạ. Những chi tiết này tạo nên chiều sâu.
• CẢM XÚC CHÂN THỰC: Mô tả cảm xúc đời thường — nhớ nhà, cô đơn, hạnh phúc nhỏ, tiếc nuối, biết ơn. Không kịch tính hóa quá mức.
• ĐỐI THOẠI TỰ NHIÊN: Lời thoại như thật — có ngắt quãng, nói linh tinh, không phải lúc nào cũng sâu sắc. Con người thật không nói kiểu văn học.
• NHỊP CHẬM: Pacing chậm, cho phép người đọc "sống" cùng nhân vật. Không vội vàng đẩy cốt truyện.
• THÀNH TRƯỞNG: Nhân vật thay đổi từ từ, tự nhiên — không có khoảnh khắc "eureka" đột ngột.
• TRÁNH: Drama quá mức, sự kiện phi thực tế, kết thúc kiểu Hollywood, nhân vật quá hoàn hảo.`
    },

    wuxia: {
        label: 'Tiên hiệp / Kiếm hiệp',
        rules: `【QUY TẮC THỂ LOẠI: TIÊN HIỆP / KIẾM HIỆP】
• HỆ CẤP SỨC MẠNH: Có hệ thống cấp bậc tu luyện/võ công rõ ràng (VD: Luyện Khí → Trúc Cơ → Kim Đan → ...). Mỗi cấp có sức mạnh và giới hạn cụ thể.
• VĂN PHONG CỔ PHONG: Sử dụng ngôn ngữ mang hơi thở cổ điển — uy nghiêm, hào sảng, trang trọng. Tên chiêu thức, môn phái phải có ý nghĩa.
• CẢNH CHIẾN ĐẤU: Mô tả chiến đấu hoành tráng, chi tiết — chiêu thức, nội lực, sách lược. Mỗi trận đấu phải có ý nghĩa với cốt truyện.
• GIANG HỒ: Xây dựng thế giới giang hồ với môn phái, bang hội, quy tắc ngầm, thù hận gia tộc, nghĩa khí.
• TU LUYỆN: Quá trình tu luyện phải gian nan, có đột phá (breakthrough) và thất bại. KHÔNG lên cấp quá dễ.
• TRIẾT LÝ: Lồng ghép triết lý Đông phương (đạo, đức, nhân quả, thiên mệnh). Nhân vật ngộ đạo qua trải nghiệm.
• CỐT TRUYỆN: Kẻ mạnh hơn luôn có, thực lực + mưu trí + ý chí mới là chiến thắng. Tránh "plot armor" — nhân vật phải nỗ lực thật sự.
• TRÁNH: Power creep vô hạn, lên cấp bằng may mắn liên tục, kẻ thù ngu ngốc, harem vô lý.`
    },

    thriller: {
        label: 'Hồi hộp / Thriller',
        rules: `【QUY TẮC THỂ LOẠI: HỒI HỘP / THRILLER】
• TENSION LIÊN TỤC: Người đọc phải luôn cảm thấy bất an. Sử dụng: deadline gấp, thông tin không đầy đủ, đe dọa tiềm ẩn, phản bội.
• STAKES CAO: Hậu quả nghiêm trọng nếu thất bại — mạng sống, bí mật quốc gia, người thân bị đe dọa. Stakes phải rõ ràng và leo thang.
• TWIST CUỐI CHƯƠNG: Mỗi chương phải kết thúc bằng thông tin mới làm đảo lộn tình hình hoặc tăng mức nguy hiểm.
• POV: Xen kẽ POV giữa protagonist và antagonist tạo dramatic irony — người đọc biết nhiều hơn nhân vật.
• NHỊP ĐỘ: Câu ngắn, dứt khoát trong cảnh căng thẳng. Không mô tả dài dòng khi action đang xảy ra.
• NHÂN VẬT DƯỚI ÁP LỰC: Cho thấy nhân vật phản ứng dưới áp lực cực độ — sai lầm, quyết định khó, đánh đổi đạo đức.
• ANTAGONIST: Kẻ thù phải thông minh, luôn đi trước một bước. KHÔNG phải kẻ xấu ngớ ngẩn.
• TRÁNH: Giải quyết quá dễ dàng, coincidence cứu nhân vật, giảm tension giữa chừng.`
    },

    comedy: {
        label: 'Hài hước',
        rules: `【QUY TẮC THỂ LOẠI: HÀI HƯỚC】
• TIMING: Hài hước nằm ở timing — setup dài vừa đủ, punchline bất ngờ. Không giải thích joke.
• TÌNH HUỐNG ABSURD: Đẩy tình huống đời thường đến mức vô lý — nhưng nhân vật phải phản ứng nghiêm túc, đó mới tạo ra tiếng cười.
• NHÂN VẬT HÀI: Mỗi nhân vật nên có kiểu hài riêng — sarcasm, ngây thơ, lầy lội, phản ứng thái quá. Tránh tất cả giống nhau.
• WORDPLAY: Sử dụng chơi chữ, hiểu lầm, double entendre phù hợp tiếng Việt. Lời thoại phải tự nhiên, không ép hài.
• PHÁ VỠ KỲ VỌNG: Tạo kỳ vọng theo hướng nghiêm túc, rồi twist sang hướng vô lý/ngớ ngẩn.
• RUNNING GAG: Sử dụng running joke (joke lặp lại với biến tấu) để tạo sự gắn kết và tăng hiệu ứng hài.
• CÓ CHIỀU SÂU: Hài hước hay nhất khi có chiều sâu — đằng sau tiếng cười là sự thật về con người.
• TRÁNH: Hài nhạt/thô tục không mục đích, giải thích joke, mọi nhân vật đều là hề.`
    },

    drama: {
        label: 'Chính kịch',
        rules: `【QUY TẮC THỂ LOẠI: CHÍNH KỊCH】
• XUNG ĐỘT NỘI TÂM: Trọng tâm là đấu tranh bên trong nhân vật — giằng xé đạo đức, lựa chọn khó khăn, mất mát không thể tránh.
• QUAN HỆ PHỨC TẠP: Mối quan hệ giữa nhân vật phức tạp, nhiều lớp — yêu thương xen lẫn thù hận, trung thành xen phản bội.
• CAO TRÀO CẢM XÚC: Xây dựng cao trào cảm xúc dần dần, bùng nổ ở đúng thời điểm. Mỗi chapter phải đẩy cảm xúc lên hoặc tạo contrast.
• ĐỐI THOẠI SÂU: Đối thoại mang trọng lượng — mỗi lời nói có thể thay đổi mối quan hệ. Sử dụng subtext (nói một đằng, nghĩa một nẻo).
• HẬU QUẢ: Mọi hành động đều có hậu quả, thường đau đớn. Không có lựa chọn hoàn hảo.
• NHÂN VẬT XÁM: Không ai hoàn toàn tốt hoặc xấu. Mỗi nhân vật có lý do của mình.
• CHÂN THỰC: Phản ứng và cảm xúc phải thật — con người khóc, nổi giận, hối hận, tha thứ theo cách phức tạp.
• TRÁNH: Melodrama quá lố, drama chỉ để có drama (không phục vụ cốt truyện), giải quyết xung đột quá dễ.`
    },

    // ═══════════════════════════════════════
    // TRUNG QUỐC (Chinese Web Novel)
    // ═══════════════════════════════════════

    xuanhuan: {
        label: 'Huyền huyễn / Khoa huyền',
        rules: `【QUY TẮC THỂ LOẠI: HUYỀN HUYỄN / KHOA HUYỀN】
• THẾ GIỚI HỖN HỢP: Kết hợp yếu tố Đông phương (tu luyện, đan dược) với phương Tây (phép thuật, sinh vật huyền bí, boss). Thế giới quan rộng lớn, nhiều tầng, nhiều vũ trụ.
• HỆ THỐNG SỨC MẠNH: Có hệ thống tu luyện/rank rõ ràng nhưng linh hoạt hơn tiên hiệp. Có thể có hệ thống game-like (level, kỹ năng, vật phẩm).
• GOLDEN FINGER: Nhân vật chính thường có "cheat" đặc biệt (hệ thống, không gian bí mật, kho tàng cổ đại). Cheat phải có giới hạn, không phải toàn năng.
• CHIẾN ĐẤU HOÀNH TRÁNG: Cảnh chiến đấu kết hợp chiêu thức, phép thuật, sách lược. Mỗi trận phải khác biệt và leo thang scale.
• NHẢ BÃO (Face-slapping): Kẻ khinh thường nhân vật chính sẽ bị đánh mặt. Xây dựng tension trước, giải quyết thỏa mãn.
• THẾ LỰC: Xây dựng hệ thống thế lực phức tạp — gia tộc, tông môn, quốc gia, thần giới. Nhân vật chính leo từ dưới lên.
• TRÁNH: Power creep vô hạn không giải thích, kẻ thù ngu ngốc liên tục, mọi nữ nhân vật đều yêu MC.`
    },

    xianxia: {
        label: 'Tiên hiệp chính thống',
        rules: `【QUY TẮC THỂ LOẠI: TIÊN HIỆP CHÍNH THỐNG】
• TU ĐẠO: Trọng tâm là con đường tu luyện hướng đến trường sinh, thành tiên, chứng đạo. Quá trình tu luyện phải gian nan, có kiếp nạn (thiên kiếp, tâm ma).
• CẢN TRỞ: Luyện Khí → Trúc Cơ → Kim Đan → Nguyên Anh → Hóa Thần → Đại Thừa → Độ Kiếp → Đại La Kim Tiên. Mỗi cấp bậc có giới hạn tuổi thọ và sức mạnh rõ ràng.
• THIÊN ĐẠO: Thế giới vận hành theo Thiên Đạo — nhân quả, khí vận, kiếp số. Mỗi hành động có hệ quả sâu xa.
• VĂN PHONG CỔ PHONG: Ngôn ngữ mang hơi thở cổ đại — trang trọng, uy nghiêm. Tên phép thuật, linh khí, linh thạch phải có ý nghĩa.
• ĐAN DƯỢC & LUYỆN KHÍ: Mô tả chi tiết quá trình luyện đan, luyện khí, trận pháp. Mỗi loại đan dược, vật phẩm có đẳng cấp.
• MÔN PHÁI & TÔNG MÔN: Xây dựng hệ thống tông môn với trưởng lão, chưởng môn, ngoại môn/nội môn. Mỗi phái có tuyệt học riêng.
• NGỘ ĐẠO: Nhân vật ngộ đạo qua trải nghiệm, chiến đấu, thiền định. Đột phá phải có cơ duyên, không chỉ nỗ lực.
• TRÁNH: Lên cấp quá dễ, bỏ qua quy tắc tu luyện đã đặt, nhân vật quá may mắn liên tục.`
    },

    chuyen_khong: {
        label: 'Xuyên không',
        rules: `【QUY TẮC THỂ LOẠI: XUYÊN KHÔNG】
• FISH OUT OF WATER: Nhân vật chính đến từ thế giới khác (hiện đại → cổ đại, hoặc ngược lại). Khoảng cách văn hóa, kiến thức tạo ra xung đột và lợi thế.
• KIẾN THỨC HIỆN ĐẠI: MC sử dụng kiến thức từ thế giới gốc (khoa học, lịch sử, y học, kinh doanh) để tạo lợi thế hợp lý. KHÔNG phải biết hết mọi thứ.
• THÍCH NGHI: Quá trình thích nghi với thế giới mới phải chân thực — ngôn ngữ, phong tục, quyền lực, mối nguy. Không thể giỏi mọi thứ ngay.
• GIỮ BÍ MẬT: MC thường phải giấu nguồn gốc. Tạo tình huống suýt bị phát hiện → tension.
• THAY ĐỔI DÒNG CHẢY: Nếu MC biết lịch sử/tương lai, phải xử lý "hiệu ứng cánh bướm" — mỗi thay đổi nhỏ có hệ quả lớn.
• BẢN SẮC: MC vẫn giữ bản sắc từ thế giới gốc, tạo conflict nội tâm giữa giá trị cũ và mới.
• TRÁNH: MC giỏi mọi thứ ngay lập tức, mọi người tin MC vô điều kiện, bỏ qua rào cản ngôn ngữ/văn hóa.`
    },

    trong_sinh: {
        label: 'Trọng sinh',
        rules: `【QUY TẮC THỂ LOẠI: TRỌNG SINH】
• ĐỜI THỨ HAI: MC được sống lại/quay về quá khứ với ký ức kiếp trước. Kiến thức về tương lai là lợi thế chính.
• SỬA SAI: Mục tiêu chính là sửa những sai lầm trong kiếp trước — cứu người thân, tránh bi kịch, trả thù kẻ đã hại mình.
• BIẾN ĐỔI TÍNH CÁCH: MC phải trưởng thành hơn kiếp trước — bình tĩnh hơn, sâu sắc hơn, nhưng vẫn mắc sai lầm MỚI (không ai hoàn hảo).
• TIÊN TRI vs THAY ĐỔI: Khi MC thay đổi một sự kiện, các sự kiện KHÁC cũng thay đổi theo. Kiến thức kiếp trước dần trở nên KHÔNG chính xác.
• KỊCH TÍNH TỪ KHÁN GIẢ: Người đọc biết điều MC biết → dramatic irony khi thấy nhân vật phụ đi vào bẫy đã biết.
• MÂU THUẪN MỚI: Mỗi vấn đề MC giải quyết phải tạo ra vấn đề MỚI không lường trước.
• TRÁNH: MC luôn đúng, kiến thức kiếp trước luôn chính xác, thiếu thách thức mới, các nhân vật phụ quá dễ bị thao túng.`
    },

    do_thi: {
        label: 'Đô thị',
        rules: `【QUY TẮC THỂ LOẠI: ĐÔ THỊ】
• HIỆN ĐẠI: Bối cảnh thành phố hiện đại — công ty, trường học, giới thượng lưu, showbiz, y thuật, thương chiến.
• SỨC MẠNH ẨN: MC có năng lực ẩn giấu (y thuật siêu phàm, võ thuật, nội công, tài chính thiên tài) nhưng sống bình thường ban đầu.
• TƯƠNG TÁC XÃ HỘI: Trọng tâm là quan hệ xã hội — gia tộc quyền lực, giới doanh nhân, người đẹp, đối thủ. Mỗi nhân vật có mạng lưới quan hệ.
• NỂ MẶT (Face): Xung đột thường xoay quanh thể diện, danh dự, và bộc lộ thực lực bất ngờ.
• LEO THANG: MC từ vô danh → lộ thực lực → đối thủ mạnh hơn → bước vào giới thượng lưu → thế lực quốc gia.
• CHÂN THỰC: Dù có yếu tố siêu nhiên, đời sống hàng ngày (ăn, ở, làm việc) phải chân thực với bối cảnh hiện đại.
• TRÁNH: Plot armor quá dày, mọi nữ nhân vật đều yêu MC, thế lực mạnh nhất luôn ngớ ngẩn.`
    },

    cung_dau: {
        label: 'Cung đấu',
        rules: `【QUY TẮC THỂ LOẠI: CUNG ĐẤU】
• MƯU KẾ: Trọng tâm là mưu đồ, toan tính, liên minh trong hậu cung/cung đình. Mỗi hành động có ý đồ sâu xa.
• THỂ DIỆN & QUYỀN LỰC: Quyền lực là tiền tệ chính. Hệ thống phẩm cấp (Quý phi, Phi, Tần, Thường tại...) tạo ra thứ bậc và xung đột.
• LIÊN MINH HAY SUYỄN: Không ai là đồng minh vĩnh viễn. Liên minh thay đổi theo lợi ích. Phản bội là đặc sản.
• ĐỐI THOẠI NGẦM: Mỗi lời nói có nhiều lớp nghĩa — khen thực chất là chê, nhún nhường thực chất là đe dọa.
• ĐỘC, DƯỢC, MƯU: Sử dụng độc dược, thuốc men, tin đồn, gièm pha, tổ chức ám hại. Vũ khí là trí tuệ, không phải sức mạnh.
• NỮ CHÍNH MẠNH MẼ: Nữ chính phải thông minh, bình tĩnh, biết nhẫn nhịn đúng lúc. Không phải "đấm thẳng mặt" mà là "giết bằng nụ cười".
• BỐI CẢNH CỔ ĐẠI: Ngôn ngữ trang trọng, lễ nghi cung đình, trang phục, kiến trúc phải phù hợp thời đại.
• TRÁNH: Giải quyết bằng bạo lực đơn giản, nữ chính quá ngu ngốc hoặc quá toàn năng, thiếu logic trong mưu kế.`
    },

    // ═══════════════════════════════════════
    // NHẬT BẢN (Japanese)
    // ═══════════════════════════════════════

    isekai: {
        label: 'Isekai / Dị giới',
        rules: `【QUY TẮC THỂ LOẠI: ISEKAI / DỊ GIỚI】
• CHUYỂN SINH: MC bị chuyển đến thế giới khác (thường là fantasy RPG-like) qua cái chết, triệu hồi, hoặc ngẫu nhiên.
• HỆ THỐNG GAME: Thế giới có level, skill, status, quest, dungeon. Mô tả status window, skill description rõ ràng.
• CHEAT ABILITY: MC thường nhận năng lực đặc biệt (Appraisal, Storage, OP Skill). Nhưng phải có giới hạn hoặc side-effect.
• PARTY: MC xây dựng party/nhóm đồng hành. Mỗi thành viên có class khác nhau (Warrior, Mage, Healer, Thief).
• SLICE OF LIFE MOMENTS: Xen kẽ chiến đấu với sinh hoạt — nấu ăn từ nguyên liệu thế giới mới, xây dựng cửa hàng, tương tác với NPC.
• WORLDBUILDING RPG: Guild, ranking adventurer, magic system, đồng tiền, hệ thống quý tộc/vương quốc.
• CULTURE SHOCK: MC phản ứng với sự khác biệt văn hóa (chế độ nô lệ, chiến tranh, phép thuật) — tạo chiều sâu.
• TRÁNH: MC quá OP ngay từ đầu, harem vô lý, thiếu thử thách thực sự, bỏ qua logic thế giới.`
    },

    mecha: {
        label: 'Mecha / Robot',
        rules: `【QUY TẮC THỂ LOẠI: MECHA / ROBOT】
• ROBOT CHIẾN ĐẤU: Trọng tâm là robot/mech khổng lồ do con người điều khiển. Mô tả kỹ thuật cơ bản (cockpit, vũ khí, năng lượng, shield).
• PILOT & MACHINE: Mối quan hệ giữa pilot và robot — đồng bộ thần kinh, giới hạn cơ thể, cải tiến nâng cấp.
• CHIẾN TRANH: Bối cảnh chiến tranh quy mô lớn — phe phái, chiến lược, hậu cần. Không chỉ có đánh nhau, còn có chính trị.
• CẢNH CHIẾN ĐẤU: Mô tả trận chiến mech chi tiết — tốc độ, va chạm, vũ khí, thiệt hại. Quy mô hoành tráng.
• ĐẠO ĐỨC CHIẾN TRANH: Đặt câu hỏi về chiến tranh, hy sinh, giá trị con người. Pilot phải đối mặt với PTSD, mất mát, lựa chọn đạo đức.
• CÔNG NGHỆ: Giải thích hợp lý nguồn năng lượng, vật liệu, hệ thống điều khiển. Không cần quá chi tiết nhưng phải nhất quán.
• TRÁNH: Robot chiến đấu không có lý do tồn tại, pilot teen quá giỏi vô lý, chiến tranh không có hệ quả.`
    },

    mahou_shoujo: {
        label: 'Mahō Shōjo / Phép thuật sở nữ',
        rules: `【QUY TẮC THỂ LOẠI: MAHŌ SHŌJO / PHÉP THUẬT SỞ NỮ】
• BIẾN HÌNH: Nhân vật chính (thường là nữ sinh) có khả năng biến hình với trang phục/vũ khí phép thuật. Cảnh biến hình phải ấn tượng.
• ĐỜI THƯỜNG + CHIẾN ĐẤU: Cân bằng giữa cuộc sống học đường bình thường và nhiệm vụ chiến đấu bí mật. Hai thế giới xung đột nhau.
• TÌNH BẠN: Sức mạnh đến từ tình bạn, yêu thương, bảo vệ. Nhóm chiến đấu gắn kết nhưng cũng có xung đột nội bộ.
• TỐI DARK: Có thể kết hợp yếu tố tối (mất mát, hy sinh, đau khổ) ẩn sau vẻ ngoài đáng yêu — tạo contrast mạnh.
• MASCOT: Thường có nhân vật đồng hành dạng thú cưng/tiên/sinh vật kỳ lạ dẫn đường.
• CHỦ ĐỀ: Trưởng thành, chấp nhận bản thân, bảo vệ người yêu thương. Phép thuật là biểu tượng cho sức mạnh nội tâm.
• TRÁNH: Quá trẻ con, thiếu stakes, chiến đấu đơn điệu, thiếu phát triển nhân vật.`
    },

    // ═══════════════════════════════════════
    // HÀN QUỐC (Korean)
    // ═══════════════════════════════════════

    murim: {
        label: 'Murim / Võ lâm Hàn',
        rules: `【QUY TẮC THỂ LOẠI: MURIM / VÕ LÂM HÀN】
• THẾ GIỚI MURIM: Tương tự wuxia Trung Quốc nhưng mang sắc thái Hàn Quốc. Có hệ thống bang phái (Chính phái, Tà phái, Ma phái), Murim Alliance.
• NỘI LỰC & VÕ CÔNG: Hệ thống nội lực (ki/qi), chiêu thức, tuyệt kỹ. Mỗi môn phái có bí kíp riêng. Cực đỉnh là cảnh giới "Transcendence".
• NHÂN VẬT CHÍNH: Thường bắt đầu yếu, bị coi thường → phát hiện bí kíp/thầy ẩn dật → tu luyện gian khổ → vượt qua giới hạn.
• NGHĨA KHÍ: Tình anh em, sư đồ, trung thành và phản bội. Quan hệ giữa đệ tử và sư phụ rất quan trọng.
• CẢNH CHIẾN ĐẤU: Chiến đấu tay đôi là đinh cao — mô tả chiêu thức, tốc độ, sách lược. "Kiểm soát ki" quan trọng.
• TONE: Nghiêm túc hơn wuxia truyền thống, ít triết lý hơn nhưng nhiều action hơn. Có thể hài hước nhẹ.
• TRÁNH: Copy paste wuxia Trung Quốc, thiếu sắc thái Hàn Quốc riêng, MC quá OP không giải thích.`
    },

    hunter: {
        label: 'Hunter / Thợ săn & Tháp',
        rules: `【QUY TẮC THỂ LOẠI: HUNTER / THỢ SĂN & THÁP】
• DUNGEON/CỔNG: Xuất hiện Dungeon/Gate/Tháp trong thế giới hiện đại. Con người được "thức tỉnh" thành Hunter để chiến đấu quái vật.
• HỆ RANK: Hunter có rank (E → S hoặc F → SSS). Rank quyết định nhiệm vụ được nhận, thu nhập, địa vị xã hội.
• GIẢ DANH YẾU: MC thường ẩn giấu sức mạnh thật, bị đánh giá thấp → bất ngờ khi lộ sức mạnh (kiểu Solo Leveling).
• HỆ THỐNG: Có hệ thống status (STR, AGI, INT...), skill, quest, item drop. Hiển thị status window khi cần.
• THẾ GIỚI HIỆN ĐẠI: Bối cảnh vẫn là xã hội hiện đại — có Guild, hiệp hội Hunter, chính phủ, doanh nghiệp. Hunter là nghề kiếm tiền.
• LEO THANG LIÊN TỤC: Dungeon ngày càng khó → Boss raid → Disaster-level threat → Quốc gia cần MC.
• CHIẾN ĐẤU: Action scenes nhanh, rõ ràng, theo kiểu game. Mô tả skill activation, cooldown, combo.
• TRÁNH: Thiếu tension (MC quá mạnh), bỏ qua khía cạnh xã hội, dungeon đơn điệu.`
    },

    regression: {
        label: 'Hồi quy / Regression',
        rules: `【QUY TẮC THỂ LOẠI: HỒI QUY / REGRESSION】
• QUAY VỀ: MC quay về quá khứ (thường sau khi chết hoặc thế giới bị hủy diệt) với kiến thức và/hoặc kỹ năng của tương lai.
• KIẾN THỨC LỢI THẾ: MC biết vị trí item ẩn, boss pattern, sự kiện tương lai, kẻ phản bội. Nhưng kiến thức dần lỗi thời khi thay đổi timeline.
• KHẨN CẤP: Có deadline rõ ràng — "đại thảm họa sẽ xảy ra sau X ngày/năm". MC phải chuẩn bị đủ mạnh.
• TỔNG TIẾN CÔNG: MC chủ động — không chờ sự kiện đến mà đi tìm cơ hội, recruit ally sớm, ngăn chặn bi kịch.
• THAY ĐỔI VẬN MỆNH: Cứu người đã chết kiếp trước, thay đổi kết cục bi thảm. Nhưng mỗi thay đổi tạo hệ quả NÊ attention.
• GIẤU BÀI: MC không thể nói "tôi đến từ tương lai". Phải tìm cách giải thích hành động bất thường → thú vị.
• TRÁNH: MC biết HẾT mọi thứ, không có thử thách mới, regression trở thành easy mode.`
    },

    // ═══════════════════════════════════════
    // PHƯƠNG TÂY (Western)
    // ═══════════════════════════════════════

    dark_fantasy: {
        label: 'Dark Fantasy',
        rules: `【QUY TẮC THỂ LOẠI: DARK FANTASY】
• THẾ GIỚI TÀN KHỐC: Thế giới fantasy nơi cái ác thắng thế, đạo đức mơ hồ, hy vọng hiếm hoi. Không có thiện/ác rõ ràng.
• BẠO LỰC & MẤT MÁT: Nhân vật chết thật, mất mát thật. Không có plot armor. Chiến tranh có hậu quả kinh hoàng.
• PHÉP THUẬT CÓ GIÁ: Phép thuật mạnh nhưng CÓ CÁI GIÁ nghiêm trọng — sức khỏe, tâm trí, linh hồn, quái dị hóa.
• NHÂN VẬT XÁM: Protagonist không phải anh hùng — có thể tàn nhẫn, ích kỷ, hoặc bị ép buộc. Anti-hero phổ biến.
• BẦU KHÔNG KHÍ: U tối, ảm đạm, tuyệt vọng. Mô tả chi tiết sự tàn phá, đau khổ, bệnh dịch, đói nghèo.
• CHỦ ĐỀ: Quyền lực, sự suy đồi, bản chất con người khi đối mặt tuyệt vọng. Ánh sáng trong bóng tối.
• TRÁNH: Tối quá mà thiếu hy vọng (grimdark vô hồn), bạo lực gratuitous, edgy không mục đích.`
    },

    urban_fantasy: {
        label: 'Urban Fantasy / Kỳ ảo đô thị',
        rules: `【QUY TẮC THỂ LOẠI: URBAN FANTASY / KỲ ẢO ĐÔ THỊ】
• THẾ GIỚI ẨN: Phép thuật/sinh vật huyền bí tồn tại ẨN trong thành phố hiện đại — ma cà rồng sống cạnh con người, phù thủy mở tiệm cà phê, rồng làm CEO.
• MASQUERADE: Có hệ thống che giấu siêu nhiên khỏi người thường. Vấn đề chính: giữ bí mật vs bảo vệ con người.
• XUNG ĐỘT KÉP: MC đối mặt cả vấn đề siêu nhiên (quái vật, lời nguyền) VÀ vấn đề đời thường (tiền thuê nhà, gia đình, tình cảm).
• CÁC CHỦNG TỘC: Ma cà rồng, người sói, fae, phù thủy, necromancer... mỗi chủng có chính trị, luật lệ, văn hóa riêng.
• NGÔN NGỮ HIỆN ĐẠI: Đối thoại tự nhiên, hiện đại, có thể hài hước, sarcastic. Sử dụng slang phù hợp.
• BỐI CẢNH: Thành phố là nhân vật — mô tả đường phố, quán bar, ngõ hẻm nơi siêu nhiên ẩn nấp.
• TRÁNH: Logic phép thuật mâu thuẫn, bỏ qua khía cạnh đời thường, worldbuilding thiếu nhất quán.`
    },

    cyberpunk: {
        label: 'Cyberpunk',
        rules: `【QUY TẮC THỂ LOẠI: CYBERPUNK】
• HIGH TECH, LOW LIFE: Công nghệ cực kỳ phát triển nhưng xã hội xuống cấp — tập đoàn thống trị, khoảng cách giàu nghèo cực lớn, tội phạm khắp nơi.
• CẢI TẠO CƠ THỂ: Cybernetic implants, augmentation, neural interface. Con người nâng cấp bản thân bằng công nghệ — nhưng mất bao nhiêu là "vẫn còn là người"?
• NÉO MẠNG: Cyberspace, hacking, AI, dữ liệu là tiền tệ. Cuộc sống ảo có thể quan trọng hơn thực.
• THẨM MỸ: Neon, mưa, bê tông, hologram, quảng cáo khắp nơi. Thành phố chật chội, ô nhiễm, nhưng lóe sáng neon.
• CHỐNG LẠI HỆ THỐNG: MC thường là kẻ ngoài rìa — hacker, mercenary, runner — chống lại tập đoàn hoặc hệ thống.
• ĐẠO ĐỨC: Ranh giới giữa người/máy, tự do/kiểm soát, riêng tư/giám sát. Mọi lựa chọn đều có trade-off.
• TRÁNH: Chỉ là sci-fi có neon, thiếu phê phán xã hội, công nghệ không có hệ quả.`
    },

    steampunk: {
        label: 'Steampunk',
        rules: `【QUY TẮC THỂ LOẠI: STEAMPUNK】
• THẨM MỸ: Thời đại Victoria + công nghệ hơi nước tiên tiến. Bánh răng, đồng thau, ống khói, khinh khí cầu, tàu hơi nước khổng lồ.
• CÔNG NGHỆ HƠI NƯỚC: Mọi thứ chạy bằng hơi nước, cơ khí, đồng hồ — automaton, cánh tay cơ giới, vũ khí hơi nước.
• XÃ HỘI VICTORIA: Giai cấp xã hội rõ ràng, lễ nghi, top hat, corset. Nhưng có thể phá vỡ chuẩn mực — phụ nữ nhà phát minh, street urchin thiên tài.
• PHÁT MINH: Nhân vật chính hoặc đồng hành thường là nhà phát minh — tạo ra gadget, thiết bị kỳ lạ. Mô tả quá trình chế tạo thú vị.
• PHIÊU LƯU: Khám phá thế giới — thành phố bay, thuộc địa dưới biển, đất nước xa lạ. Bản đồ, la bàn, explorer spirit.
• KẾT HỢP: Có thể kết hợp với phép thuật (steampunk fantasy) hoặc thuần cơ khí. Magic vs Technology là conflict thú vị.
• TRÁNH: Chỉ thêm bánh răng vào fantasy thông thường, bỏ qua xã hội Victoria, thiếu imagination trong phát minh.`
    },

    gothic: {
        label: 'Gothic',
        rules: `【QUY TẮC THỂ LOẠI: GOTHIC】
• BẦU KHÔNG KHÍ: U ám, bí ẩn, cổ kính. Lâu đài cũ, nghĩa địa, đêm sương mù, nến lập lòe, chân dung nhìn theo.
• SIÊU NHIÊN TINH TẾ: Ma quỷ/siêu nhiên ẩn hiện nhưng không rõ ràng — khiến người đọc nghi ngờ liệu có thật hay ảo giác.
• BÍ MẬT GIA ĐÌNH: Trọng tâm thường là bí mật tối tăm trong gia đình/dòng họ — tội ác quá khứ, lời nguyền, di sản bất hạnh.
• CẢM XÚC MÃNH LIỆT: Tình yêu ám ảnh, nỗi sợ, tội lỗi, sự mê đắm, cô đơn. Cảm xúc cường độ cao, có thể ranh giới điên rồ.
• NỮ NHÂN VẬT CHÍNH: Thường có nữ chính mạnh mẽ bị giam giữ/đe dọa trong không gian gothic — nhưng chống lại bằng trí tuệ.
• NGÔN NGỮ: Văn phong trang trọng, giàu hình ảnh, ẩn dụ mạnh. Mô tả chi tiết không gian, ánh sáng, bóng tối.
• TRÁNH: Biến thành kinh dị rẻ tiền, mất bầu không khí cổ kính, thiếu chiều sâu tâm lý.`
    },

    dystopia: {
        label: 'Dystopia / Phản địa đàng',
        rules: `【QUY TẮC THỂ LOẠI: DYSTOPIA / PHẢN ĐỊA ĐÀNG】
• XÃ HỘI KIỂM SOÁT: Xã hội tưởng hoàn hảo nhưng thực chất kiểm soát con người — giám sát, tuyên truyền, giai cấp cứng nhắc, quy tắc phi nhân.
• HỆ THỐNG ÁP BỨC: Chính phủ/tổ chức kiểm soát thông qua: công nghệ, thuốc men, tôn giáo, sợ hãi, hoặc "hạnh phúc giả tạo".
• NHÂN VẬT THỨC TỈNH: MC dần nhận ra sự thật đằng sau xã hội "hoàn hảo" → nổi loạn. Quá trình thức tỉnh phải tự nhiên, không đột ngột.
• GIÁ CỦA TỰ DO: Chống lại hệ thống có cái giá cực kỳ đắt — mất gia đình, bạn bè, an toàn, tính mạng.
• MIRROR THỰC TẾ: Dystopia hay nhất khi phản chiếu vấn đề thực tế — giám sát, bất bình đẳng, khủng hoảng khí hậu, AI kiểm soát.
• PROPAGANDA: Mô tả cách hệ thống tuyên truyền — slogan, nghi lễ, lịch sử giả, ngôn ngữ kiểm soát (Newspeak).
• TRÁNH: Xã hội ác rõ ràng quá (không ai tin vào), giải pháp quá dễ, MC đơn thân lật đổ cả hệ thống.`
    },

    superhero: {
        label: 'Siêu anh hùng',
        rules: `【QUY TẮC THỂ LOẠI: SIÊU ANH HÙNG】
• SIÊU NĂNG LỰC: Hệ thống siêu năng lực rõ ràng — mỗi hero/villain có power set riêng với điểm mạnh VÀ điểm yếu.
• DANH TÍNH KÉP: Cuộc sống thường nhật vs cuộc sống siêu anh hùng. Xung đột giữa hai bản thân, nguy hiểm lộ danh tính.
• TRÁCH NHIỆM: "With great power comes great responsibility" — đặt câu hỏi đạo đức về việc sử dụng sức mạnh.
• VILLAIN CÓ CHIỀU SÂU: Villain không chỉ "muốn hủy diệt thế giới" — phải có động cơ, backstory, thậm chí có lý. Anti-villain thú vị.
• CẢNH CHIẾN ĐẤU: Action hoành tráng, sáng tạo — sử dụng siêu năng lực độc đáo, kết hợp, phản ứng linh hoạt. Phá hủy đô thị có hệ quả.
• DƯ LUẬN: Xã hội phản ứng với siêu anh hùng — ngưỡng mộ lẫn sợ hãi, luật pháp, media, chính trị.
• NHÓM/TEAM: Nếu có team, mỗi thành viên có vai trò, xung đột nội bộ, dynamic thú vị.
• TRÁNH: Power level không nhất quán, villain quá yếu, giải quyết mọi thứ bằng đấm mạnh hơn.`
    },

    other: {
        label: 'Khác / Chung',
        rules: `【QUY TẮC CHUNG】
• Viết văn phong rõ ràng, hấp dẫn, phù hợp tông giọng của truyện.
• Phát triển nhân vật có chiều sâu — tính cách, động lực, điểm yếu.
• Xây dựng cốt truyện logic — nguyên nhân → hệ quả, foreshadowing, payoff.
• Cân bằng giữa mô tả, đối thoại, và hành động.
• Kết thúc mỗi chương với hook hoặc cliffhanger.`
    }
};

/**
 * Get genre-specific writing rules for a single genre key.
 * @param {string} genreKey - Genre key (e.g. 'romance', 'horror')
 * @returns {string} Genre rules text, or empty string if not found
 */
export function getGenreRules(genreKey) {
    return GENRE_RULES[genreKey]?.rules || '';
}

/**
 * Get the label for a genre key.
 * @param {string} genreKey - Genre key
 * @returns {string} Human-readable genre label
 */
export function getGenreLabel(genreKey) {
    return GENRE_RULES[genreKey]?.label || genreKey;
}

/**
 * Build a combined genre instruction from a story's genres.
 * Reads story.genres[] (array) and story.genre (string fallback),
 * combines rules for all selected genres into one instruction block.
 *
 * @param {Object} story - The story object with genres/genre fields
 * @returns {string} Combined genre instruction, ready to inject into system prompt
 */
export function buildGenreInstruction(story) {
    if (!story) return '';

    // Collect all genre keys
    const genreKeys = [];
    if (story.genres && Array.isArray(story.genres) && story.genres.length > 0) {
        genreKeys.push(...story.genres);
    } else if (story.genre) {
        genreKeys.push(story.genre);
    }

    if (genreKeys.length === 0) return '';

    // Deduplicate
    const uniqueKeys = [...new Set(genreKeys)];

    // Collect rules
    const rulesBlocks = uniqueKeys
        .map(key => getGenreRules(key))
        .filter(Boolean);

    if (rulesBlocks.length === 0) return '';

    // Build the combined instruction
    const genreLabels = uniqueKeys
        .map(key => getGenreLabel(key))
        .join(', ');

    return `
<genre_rules label="${genreLabels}">
Truyện thuộc thể loại: ${genreLabels}.
AI PHẢI tuân thủ các quy tắc viết đặc trưng cho thể loại bên dưới.
Khi có nhiều thể loại, kết hợp tinh tế các quy tắc — ưu tiên thể loại chính.

${rulesBlocks.join('\n\n')}
</genre_rules>`;
}

/**
 * Get a short genre reminder string for inline use in prompts.
 * @param {Object} story - Story object
 * @returns {string} Short reminder line or empty string
 */
export function getGenreReminder(story) {
    if (!story) return '';

    const genreKeys = story.genres?.length > 0 ? story.genres : (story.genre ? [story.genre] : []);
    if (genreKeys.length === 0 || (genreKeys.length === 1 && genreKeys[0] === 'other')) return '';

    const displayLabels = genreKeys
        .map(key => getGenreLabel(key))
        .join(', ');

    return `⭐ Viết đúng phong cách thể loại "${displayLabels}" — tuân thủ QUY TẮC THỂ LOẠI trong system instruction`;
}
