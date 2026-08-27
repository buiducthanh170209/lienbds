"use client";

import { useState, useRef } from "react";

export default function Home() {
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [prompt, setPrompt] = useState("");
  const [status, setStatus] = useState<{ msg: string; type: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [tableData, setTableData] = useState<{ headers: string[]; rows: string[][] } | null>(null);

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

      const data = await res.json();

      // Tải file Excel
      const byteCharacters = atob(data.excel);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "ket-qua-ai.xlsx";
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      // Hiển thị preview bảng
      if (data.table) {
        setTableData(data.table);
      }

      setStatus({ msg: "✅ Đã tạo file ket-qua-ai.xlsx và tải về thành công!", type: "success" });
    } catch (error: any) {
      console.error(error);
      setStatus({
        msg: error.message || "Có lỗi xảy ra khi xử lý ảnh",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-lg p-6 md:p-8">
        <h1 className="text-2xl md:text-3xl font-bold text-center mb-2">
          Ảnh → Excel bằng AI
        </h1>
        <p className="text-center text-gray-500 mb-8">
          Upload ảnh bảng biểu / hóa đơn / danh sách → AI chuyển thành file Excel
        </p>

        {/* Drop zone */}
        <div
          ref={dropZoneRef}
          onDrop={onDrop}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center cursor-pointer hover:border-blue-500 transition-colors mb-6"
        >
          {preview ? (
            <img
              src={preview}
              alt="Preview"
              className="max-h-64 mx-auto rounded-lg object-contain"
            />
          ) : (
            <div>
              <p className="text-lg font-medium">Kéo thả ảnh vào đây</p>
              <p className="text-sm text-gray-500 mt-1">hoặc click để chọn file (tối đa 8MB)</p>
            </div>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          />
        </div>

        {/* Prompt */}
        <div className="mb-6">
          <label className="block text-sm font-medium mb-2">
            Yêu cầu của bạn (prompt)
          </label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Ví dụ: Trích xuất toàn bộ bảng thành Excel, cột A là tên, cột B là số lượng..."
            className="w-full border border-gray-300 rounded-lg p-3 h-28 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Button */}
        <button
          onClick={convert}
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-3 rounded-lg transition-colors"
        >
          {loading ? "Đang xử lý..." : "Chuyển thành Excel"}
        </button>

        {/* Status */}
        {status && (
          <div
            className={`mt-4 p-3 rounded-lg text-sm ${
              status.type === "error"
                ? "bg-red-50 text-red-700"
                : status.type === "success"
                ? "bg-green-50 text-green-700"
                : "bg-blue-50 text-blue-700"
            }`}
          >
            {status.msg}
          </div>
        )}

        {/* Table preview */}
        {tableData && (
          <div className="mt-8 overflow-x-auto">
            <h3 className="font-medium mb-3">Xem trước dữ liệu:</h3>
            <table className="min-w-full border border-gray-200 text-sm">
              <thead className="bg-gray-100">
                <tr>
                  {tableData.headers.map((h, i) => (
                    <th key={i} className="border px-3 py-2 text-left">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tableData.rows.map((row, i) => (
                  <tr key={i}>
                    {row.map((cell, j) => (
                      <td key={j} className="border px-3 py-2">
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
