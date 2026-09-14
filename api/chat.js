export default async function handler(req, res) {
  // Chỉ chấp nhận phương thức POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Lấy API Key từ Biến môi trường trên Vercel (Không lộ ra ngoài)
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: 'Chưa cấu hình GEMINI_API_KEY trên Vercel' });
  }

  const { message, history } = req.body;

  if (!message) {
    return res.status(400).json({ error: 'Message is required' });
  }

  const FAQ_PROMPT = `Bạn là trợ lý tư vấn tự động cho website. Hãy trả lời ngắn gọn, lịch sự dựa trên dữ liệu FAQ sau:
1. Giờ làm việc: 8:00 - 17:00 từ Thứ 2 đến Thứ 6.
2. Phí vận chuyển: Miễn phí cho đơn hàng từ 500.000đ, đơn dưới tính phí 30.000đ.
3. Chính sách đổi trả: Đổi trả trong 7 ngày nếu có lỗi sản xuất.
4. Địa chỉ: 123 Đường ABC, Quận 1, TP. Hồ Chí Minh.

Nếu câu hỏi không thuộc thông tin trên, hãy xin lỗi lịch sự và bảo người dùng gọi Hotline 1900-xxxx.`;

  // Chuẩn bị danh sách tin nhắn gửi lên Gemini API
  const contents = history || [];
  contents.push({ role: 'user', parts: [{ text: message }] });

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: FAQ_PROMPT }] },
        contents: contents
      })
    });

    const data = await response.json();

    if (data.candidates && data.candidates[0]?.content?.parts[0]?.text) {
      const reply = data.candidates[0].content.parts[0].text;
      return res.status(200).json({ reply });
    } else {
      return res.status(500).json({ error: 'Không lấy được phản hồi từ Gemini API' });
    }
  } catch (error) {
    return res.status(500).json({ error: 'Lỗi máy chủ: ' + error.message });
  }
}
