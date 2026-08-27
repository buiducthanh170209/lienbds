import { GoogleGenerativeAI } from "@google/generative-ai";
import * as XLSX from "xlsx";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60; // giây

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Chưa cấu hình GEMINI_API_KEY trên Vercel" },
        { status: 500 }
      );
    }

    const formData = await req.formData();
    const imageFile = formData.get("image") as File | null;
    const userPrompt = (formData.get("prompt") as string) || "";

    if (!imageFile) {
      return NextResponse.json({ error: "Thiếu ảnh" }, { status: 400 });
    }
    if (!userPrompt.trim()) {
      return NextResponse.json({ error: "Thiếu yêu cầu" }, { status: 400 });
    }

    // Chuyển ảnh sang base64
    const arrayBuffer = await imageFile.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");
    const mimeType = imageFile.type || "image/jpeg";

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      generationConfig: {
        temperature: 0.1,
        responseMimeType: "application/json",
      },
    });

    const systemPrompt = `Bạn là AI chuyên trích xuất dữ liệu từ ảnh thành bảng Excel.
Người dùng sẽ gửi ảnh + yêu cầu cụ thể bằng tiếng Việt.
Nhiệm vụ của bạn:
1. Đọc kỹ ảnh và yêu cầu.
2. Trả về CHỈ một JSON hợp lệ theo đúng cấu trúc sau (không giải thích thêm, không markdown):
{
  "headers": ["Cột 1", "Cột 2", ...],
  "rows": [
    ["giá trị 1", "giá trị 2", ...],
    ...
  ]
}
- headers và rows phải khớp với yêu cầu người dùng.
- Nếu không có dữ liệu phù hợp, trả về headers rỗng và rows rỗng.
- Số phải để dạng số (không có dấu phẩy ngăn cách), ngày tháng giữ nguyên chuỗi.
- Không thêm bất kỳ text nào ngoài JSON.`;

    const result = await model.generateContent([
      {
        text: systemPrompt + "\n\nYêu cầu của người dùng:\n" + userPrompt,
      },
      {
        inlineData: {
          mimeType,
          data: base64,
        },
      },
    ]);

    const responseText = result.response.text();
    // Làm sạch nếu AI vẫn thêm markdown
    let jsonText = responseText
      .replace(/```json/gi, "")
      .replace(/```/g, "")
      .trim();

    let parsed: { headers: string[]; rows: any[][] };
    try {
      parsed = JSON.parse(jsonText);
    } catch {
      console.error("Raw AI response:", responseText);
      return NextResponse.json(
        { error: "AI trả về dữ liệu không đúng định dạng JSON" },
        { status: 500 }
      );
    }

    if (!parsed.headers || !Array.isArray(parsed.rows)) {
      return NextResponse.json(
        { error: "Cấu trúc dữ liệu từ AI không hợp lệ" },
        { status: 500 }
      );
    }

    // Tạo file Excel
    const wsData = [parsed.headers, ...parsed.rows];
    const worksheet = XLSX.utils.aoa_to_sheet(wsData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Data");

    const excelBuffer = XLSX.write(workbook, {
      type: "buffer",
      bookType: "xlsx",
    });

    // Trả file + header chứa preview data
    return new NextResponse(excelBuffer, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": 'attachment; filename="ket-qua-ai.xlsx"',
        "X-Table-Data": JSON.stringify(parsed),
      },
    });
  } catch (error: any) {
    console.error("Convert error:", error);
    return NextResponse.json(
      { error: error.message || "Lỗi xử lý phía server" },
      { status: 500 }
    );
  }
}
