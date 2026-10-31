"use client";

export function DownloadButton({
  text,
  filename,
  label = "Descargar",
  className = "",
}: {
  text: string;
  filename: string;
  label?: string;
  className?: string;
}) {
  function download() {
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <button type="button" onClick={download} className={`btn btn-ghost btn-sm ${className}`}>
      {label}
    </button>
  );
}
