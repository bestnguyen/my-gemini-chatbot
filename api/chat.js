import fs from 'fs';
import path from 'path';

export default async function handler(req, res) {
  // Chỉ chấp nhận phương thức POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Lấy API Key từ Environment Variables trên Vercel
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Thiếu cấu hình GEMINI_API_KEY trên Vercel' });
  }

  const { message, history } = req.body;
  if (!message) {
    return res.status(400).json({ error: 'Nội dung tin nhắn không được để trống' });
  }

  try {
    // 1. Đọc nội dung file FAQ Markdown từ thư mục gốc dự án
    const filePath = path.join(process.cwd(), 'FAQ_Chatbot_PhuHuynh_THCS_PhuAn.md');
    
    let faqContent = '';
    if (fs.existsSync(filePath)) {
      faqContent = fs.readFileSync(filePath, 'utf8');
    } else {
      console.warn('Không tìm thấy file FAQ Markdown!');
    }

    // 2. Thiết lập System Instruction chứa toàn bộ thông tin FAQ
    const systemInstruction = `Bạn là Trợ lý tư vấn tự động cho Phụ huynh Trường THCS Phú An (Năm học 2026 - 2027).
Nhiệm vụ của bạn là giải đáp các thắc mắc về nề nếp, thời gian học, nội quy, thi đua và quy định an toàn giao thông của nhà trường.

DƯỚI ĐÂY LÀ TÀI LIỆU FAQ CHÍNH THỨC DÙNG ĐỂ TRẢ LỜI:
---
${faqContent}
---

QUY TẮC TRẢ LỜI:
1. Trả lời lịch sự, ân cần, xưng hô "Em/Tôi" và "Phụ huynh" hoặc "Anh/Chị".
2. Câu trả lời phải ngắn gọn, rõ ràng, căn cứ chuẩn xác theo dữ liệu trong file FAQ trên (chỉ rõ thời gian, số điểm trừ/cộng hoặc quy định cụ thể nếu có).
3. Nếu thắc mắc không có thông tin trong tài liệu FAQ, hãy lịch sự thông báo chưa có dữ liệu và hướng dẫn phụ huynh liên hệ trực tiếp với Giáo viên chủ nhiệm (GVCN) hoặc Ban Giám hiệu nhà trường để được hỗ trợ.`;

    // 3. Chuẩn bị danh sách lịch sử hội thoại
    const contents = history || [];
    contents.push({ role: 'user', parts: [{ text: message }] });

    // 4. Gọi Gemini API (Sử dụng mô hình gemini-2.5-flash)
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemInstruction }] },
        contents: contents
      })
    });

    const data = await response.json();

    if (data.candidates && data.candidates[0]?.content?.parts[0]?.text) {
      const reply = data.candidates[0].content.parts[0].text;
      return res.status(200).json({ reply });
    } else {
      return res.status(500).json({ error: 'Không thể lấy phản hồi từ Gemini API' });
    }
  } catch (error) {
    return res.status(500).json({ error: 'Lỗi máy chủ: ' + error.message });
  }
}
