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

      const data = await res.json();

      // Tạo file Excel từ base64 và tải về
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
