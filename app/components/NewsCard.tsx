type NewsCardProps = {
  judul: string
  tanggalFormatted: string
  cuplikan: string
  slug: string
  gambar_url?: string
}

export default function NewsCard({
  judul,
  tanggalFormatted,
  cuplikan,
  slug,
  gambar_url,
}: NewsCardProps) {
  return (
    <div className="col-md-4">
      <div className="card h-100 shadow-sm border rounded-3">
        <img
          src={gambar_url || "/default-news.png"}
          className="card-img-top"
          alt={judul}
          style={{ height: "150px", objectFit: "cover" }}
        />
        <div className="card-body p-3">
          <h6 className="card-title fw-bold mb-1">{judul}</h6>
          <small className="text-muted">{tanggalFormatted}</small>
          <p className="card-text small mt-1">{cuplikan}</p>
          <a href={`/berita/${slug}`} className="stretched-link"></a>
        </div>
      </div>
    </div>
  )
}
