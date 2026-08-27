"use client";

import { useState, useRef } from "react";

export default function Home() {
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [prompt, setPrompt] = useState("");
  const [status, setStatus] = useState<{ msg: string; type: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [tableData, setTableData] = useState<{ headers: string[]; rows: any[][] } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  const handleFile = (selectedFile: File) => {
    if (!selectedFile.type.startsWith("image/")) {
      setStatus({ msg: "Chỉ chấp nhận file ảnh (jpg, png, webp...)", type: "error" });
      return;
    }
    if (selectedFile.size > 8 * 1024 * 1024) {
      setStatus({ msg: "Ảnh quá lớn (tối đa 8MB)", type: "error" });
      return;
    }

    setFile(selectedFile);
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreview(e.target?.result as string);
      setStatus(null);
      setTableData(null);
    };
    reader.readAsDataURL(selectedFile);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    dropZoneRef.current?.classList.remove("dragover");
    if (e.dataTransfer.files?.[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    dropZoneRef.current?.classList.add("dragover");
  };

  const onDragLeave = () => {
    dropZoneRef.current?.classList.remove("dragover");
  };

  const convert = async () => {
    if (!file) {
      setStatus({ msg: "Vui lòng upload ảnh!", type: "error" });
      return;
    }
    if (!prompt.trim()) {
      setStatus({ msg: "Vui lòng viết yêu cầu!", type: "error" });
      return;
    }

    setLoading(true);
    setStatus({ msg: "🤖 AI đang đọc ảnh và xử lý theo yêu cầu của bạn...", type: "loading" });
    setTableData(null);

    try {
      const formData = new FormData();
      formData.append("image", file);
      formData.append("prompt", prompt.trim());

      const res = await fetch("/api/convert", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Lỗi server");
      }

      // Lấy file Excel
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "ket-qua-ai.xlsx";
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      // Lấy preview table từ header
      const headersJson = res.headers.get("X-Table-Data");
      if (headersJson) {
        try {
          setTableData(JSON.parse(headersJson));
        } catch {}
      }

      setStatus({ msg: "✅ Đã tạo file ket-qua-ai.xlsx và tải về thành công!", type: "success" });
    } catch (err: any) {
      console.error(err);
      setStatus({ msg: "❌ Lỗi: " + (err.message || "Không thể xử lý"), type: "error" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <h1>🖼️ → 📊 AI Ảnh thành Excel</h1>
      <p className="subtitle">
        Upload ảnh + viết yêu cầu → AI tự tạo file .xlsx
      </p>

      <div className="card">
        <label>1. Upload ảnh (bảng, hóa đơn, danh sách, biểu đồ...)</label>
        <div
          ref={dropZoneRef}
          className="upload-zone"
          onClick={() => fileInputRef.current?.click()}
          onDrop={onDrop}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
        >
          <p>Kéo thả ảnh vào đây hoặc click để chọn</p>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          />
          {preview && <img src={preview} alt="Preview" />}
        </div>
      </div>

      <div className="card">
        <label>2. Viết yêu cầu của bạn (bằng tiếng Việt)</label>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder={`Ví dụ:
- Trích xuất toàn bộ bảng thành Excel
- Cột A: Tên sản phẩm, Cột B: Số lượng, Cột C: Đơn giá
- Chỉ lấy các dòng có số lượng > 0
- Thêm cột Thành tiền = Số lượng × Đơn giá`}
        />
      </div>

      <button onClick={convert} disabled={loading || !file}>
        {loading ? "Đang xử lý..." : "Chuyển thành Excel"}
      </button>

      {status && (
        <div className={`status ${status.type}`}>{status.msg}</div>
      )}

      {tableData && tableData.headers?.length > 0 && (
        <div className="preview-table">
          <table>
            <thead>
              <tr>
                {tableData.headers.map((h, i) => (
                  <th key={i}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tableData.rows.map((row, ri) => (
                <tr key={ri}>
                  {row.map((cell, ci) => (
                    <td key={ci}>{cell ?? ""}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="footer">
        Powered by Gemini Vision • Deploy trên Vercel
      </p>
    </div>
  );
}
