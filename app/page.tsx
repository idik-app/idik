// app/page.tsx
"use client"

import Image from "next/image"
import Link from "next/link"
import { useState, useEffect } from "react"

export default function Home() {
  const [berita, setBerita] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showPassword, setShowPassword] = useState(false)

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch("/api/berita")
        const data = await res.json()
        setBerita(data)
      } catch (err) {
        console.error("Gagal fetch berita:", err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  return (
    <div>
      {/* Hero Section */}
      <section
        className="py-5 text-white fade-in"
        style={{
          background: "linear-gradient(135deg, #0d6efd, #ffffff)",
        }}
      >
        <div className="container">
          <div className="row align-items-center justify-content-center">
            {/* Kiri */}
            <div className="col-md-6 text-center text-md-start mb-4 mb-md-0">
              <Image
                src="/logo-idik.png"
                alt="Logo IDIK"
                width={80}
                height={80}
                className="mb-2"
              />
              <h1 className="fw-bold fs-3 mb-2">IDIK-App</h1>
              <p className="text-dark small mb-0">
                Instalasi Diagnostik Intervensi Kardiovaskular <br />
                RSUD dr. Moh. Soewandhie
              </p>
              <p className="text-dark mt-2 fst-italic">
                “Layanan Cathlab Terintegrasi untuk Anda”
              </p>
            </div>

            {/* Kanan (Login Form) */}
            <div className="col-md-4 fade-in">
              <div
                className="p-3 bg-light rounded shadow-sm mx-auto"
                style={{ maxWidth: "280px" }}
              >
                <h6 className="mb-3 text-dark fw-semibold text-center">
                  Login
                </h6>
                <div className="mb-2 text-start">
                  <label className="form-label small mb-1">Username</label>
                  <div className="input-group input-group-sm">
                    <span className="input-group-text">
                      <i className="bi bi-person"></i>
                    </span>
                    <input
                      type="text"
                      className="form-control form-control-sm"
                      placeholder="Masukkan username"
                    />
                  </div>
                </div>
                <div className="mb-2 text-start">
                  <label className="form-label small mb-1">Password</label>
                  <div className="input-group input-group-sm">
                    <span className="input-group-text">
                      <i className="bi bi-lock"></i>
                    </span>
                    <input
                      type={showPassword ? "text" : "password"}
                      className="form-control form-control-sm"
                      placeholder="Masukkan password"
                    />
                    <button
                      type="button"
                      className="btn btn-outline-secondary btn-sm"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      <i className={`bi ${showPassword ? "bi-eye-slash" : "bi-eye"}`}></i>
                    </button>
                  </div>
                </div>
                <button className="btn btn-primary w-100 btn-sm mb-2">
                  Masuk
                </button>
                <div className="d-flex justify-content-between small">
                  <Link href="#" className="text-primary">
                    Lupa password?
                  </Link>
                  <Link href="#" className="text-primary">
                    Daftar
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Berita Section */}
      <section className="py-5 bg-light fade-in">
        <div className="container">
          <h2 className="mb-4 border-bottom pb-2">Berita Terbaru</h2>

          {loading ? (
            <div className="text-center">
              <div className="spinner-border text-primary" role="status"></div>
              <p className="mt-2">Memuat berita...</p>
            </div>
          ) : berita.length === 0 ? (
            <p className="text-muted">Belum ada berita terbaru</p>
          ) : (
            <div className="row g-4">
              {berita.map((item) => (
                <div className="col-md-4" key={item.id}>
                  <div className="card h-100 shadow-sm hover-card">
                    <Image
                      src={item.gambar_url || "/logo-idik.png"}
                      alt={item.judul}
                      width={400}
                      height={200}
                      className="card-img-top"
                    />
                    <div className="card-body">
                      <span className="badge bg-primary me-2">
                        {item.kategori}
                      </span>
                      {item.isBaru && (
                        <span className="badge bg-danger">Baru</span>
                      )}
                      <h5 className="mt-2">{item.judul}</h5>
                      <p className="text-muted small">
                        {item.tanggalFormatted}
                      </p>
                      <p>{item.cuplikan}</p>
                      <Link
                        href={`/berita/${item.slug}`}
                        className="btn btn-outline-primary btn-sm"
                      >
                        Baca Selengkapnya
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="py-4 bg-dark text-light mt-5 fade-in">
        <div className="container">
          <div className="row">
            <div className="col-md-4 mb-3">
              <h5>Kontak</h5>
              <p>
                RSUD dr. Moh. Soewandhie <br />
                Jl. Tambak Rejo No. 45 Surabaya <br />
                Telp: (031) 123456 <br />
                Email: info@idikapp.com
              </p>
            </div>
            <div className="col-md-4 mb-3">
              <h5>Quick Links</h5>
              <ul className="list-unstyled">
                <li>
                  <Link href="#" className="text-light link-underline">
                    Tentang
                  </Link>
                </li>
                <li>
                  <Link href="#" className="text-light link-underline">
                    Panduan
                  </Link>
                </li>
                <li>
                  <Link href="#" className="text-light link-underline">
                    FAQ
                  </Link>
                </li>
                <li>
                  <Link href="#" className="text-light link-underline">
                    SIMRS
                  </Link>
                </li>
              </ul>
            </div>
            <div className="col-md-4 mb-3">
              <h5>Sosial Media</h5>
              <div className="d-flex gap-3">
                <a
                  href="#"
                  className="btn btn-outline-light btn-sm rounded-circle hover-social"
                  title="Facebook"
                >
                  <i className="bi bi-facebook"></i>
                </a>
                <a
                  href="#"
                  className="btn btn-outline-light btn-sm rounded-circle hover-social"
                  title="Instagram"
                >
                  <i className="bi bi-instagram"></i>
                </a>
                <a
                  href="#"
                  className="btn btn-outline-light btn-sm rounded-circle hover-social"
                  title="WhatsApp"
                >
                  <i className="bi bi-whatsapp"></i>
                </a>
                <a
                  href="#"
                  className="btn btn-outline-light btn-sm rounded-circle hover-social"
                  title="YouTube"
                >
                  <i className="bi bi-youtube"></i>
                </a>
              </div>
            </div>
          </div>
          <div className="text-center mt-3 small">
            <p>
              © 2025 IDIK-App – Instalasi Diagnostik Intervensi Kardiovaskular
              RSUD dr. Moh. Soewandhie
            </p>
          </div>
        </div>
      </footer>

      {/* Style tambahan animasi */}
      <style jsx global>{`
        .btn,
        .card,
        .form-control,
        .btn-outline-light {
          transition: all 0.3s ease;
        }
        .btn:hover {
          transform: scale(1.05);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
        }
        .hover-card:hover {
          transform: translateY(-6px);
          box-shadow: 0 6px 18px rgba(0, 0, 0, 0.2);
        }
        .form-control:focus {
          box-shadow: 0 0 8px rgba(13, 110, 253, 0.5);
          border-color: #0d6efd;
        }
        .hover-social:hover {
          transform: scale(1.15) rotate(5deg);
          background-color: rgba(255, 255, 255, 0.2);
        }
        .fade-in {
          animation: fadeInUp 0.8s ease forwards;
          opacity: 0;
        }
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .link-underline:hover {
          text-decoration: underline;
        }
      `}</style>
    </div>
  )
}
