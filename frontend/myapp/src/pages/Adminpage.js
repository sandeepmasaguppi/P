// ============================================================
//  AdminPage.js  —  Advocate Hub Admin Page
//  Password-protected admin console:
//   - Approve / reject pending advocate signups
//   - Add / edit / delete any advocate account
//   - View Contact & Partners form submissions as messages
//
//  ⚠️ Demo-only auth: the admin credentials below are hardcoded
//  and checked entirely client-side. For a real deployment, move
//  admin auth to a backend with hashed passwords and a real
//  session/token — never ship credentials in client code.
// ============================================================

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  getAdvocates,
  addAdvocate,
  updateAdvocate,
  deleteAdvocate,
  approveAdvocate,
  rejectAdvocate,
  loadAdvocates,
} from "../data/Advocatesstore";
import { api, setAdminToken, getAdminToken } from "../data/api";
import { createClient, updateClient, deleteClient, getClients, getLocalClients } from "../data/Clientsstore";
import BrandLogo from "../components/BrandLogo";
import { getMessages, markAsRead, deleteMessage } from "../data/MessageStore";
import { getQuestions, markQuestionAsRead, deleteQuestion } from "../data/QuestionStore";
import {
  COURT_LEVELS,
  HIGH_COURT_BENCHES,
  getDistricts,
  getTaluksForDistrict,
  buildTargetCourt,
} from "../data/CourtsData";
import { getTheme, toggleTheme as toggleGlobalTheme } from "../data/themeStore";
import "./AdminPage.css";
const REQUESTS_KEY   = "law4u_requests";    // { [advocateId]: Request[] }
const BOOKINGS_KEY   = "law4u_bookings";    // { bookingId: Booking }


function readLS(key, fallback = null) {
  try { const r = localStorage.getItem(key); return r ? JSON.parse(r) : fallback; }
  catch { return fallback; }
}
function writeLS(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
}

function loadRequests()  { return readLS(REQUESTS_KEY, {}); }
function loadBookings()  { return readLS(BOOKINGS_KEY, {}); }

function saveBookings(b) { writeLS(BOOKINGS_KEY, b); }
function saveRequests(r) { writeLS(REQUESTS_KEY, r); }

// Save accepted booking to bookings store
function persistBooking(req, advocate) {
  const all  = loadBookings();
  const key  = `${advocate.id}_${req.id || Date.now()}`;
  all[key]   = {
    bookingId:     key,
    advocateId:    advocate.id,
    advocateName:  advocate.name,
    advocateSpec:  advocate.speciality || advocate.practiceArea || "",
    advocateCity:  advocate.city || "",
    clientName:    req.clientName,
    clientEmail:   req.clientEmail || "",
    clientPhone:   req.clientPhone || "",
    clientCity:    req.clientCity  || "",
    message:       req.message     || "",
    status:        "accepted",
    acceptedAt:    req.acceptedAt  || new Date().toISOString(),
    requestedAt:   req.requestedAt || new Date().toISOString(),
    caseStage:     req.caseStage   || "Start Case",
  };
  saveBookings(all);
  return all[key];
}


const PRACTICE_AREAS = [
  "Criminal Law","Family Law","Property Law","Civil Law",
  "Corporate Law","Tax Law","Labour Law","Consumer Law",
  "Cyber Law","Immigration","Banking Law","Intellectual Property",
  "Divorce","Cheque Bounce","NRI Matters","Supreme Court",
];
function getReqStats(advocateId, allReqs) {
  const list = allReqs[advocateId] || [];
  return {
    total:    list.length,
    pending:  list.filter(r => r.status === "pending").length,
    accepted: list.filter(r => r.status === "accepted").length,
    declined: list.filter(r => r.status === "declined").length,
  };
}


const EMPTY_FORM = {
  name: "", email: "", phone: "", password: "",
  city: "", speciality: "", court: "", courtLevel: "", district: "", taluk: "", bench: "",
  experience: "", fee: "", bio: "", barId: "", status: "approved",
};

// ─────────────────────────────────────────────────────────────
//  MICRO COMPONENTS
// ─────────────────────────────────────────────────────────────

// Avatar
function Avi({ name = "", color, size = 38, src }) {
  const [err, setErr] = useState(false);
  const initials = name.replace(/^Adv\.\s*/i, "")
    .split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
  const bg = color || colorFor(name.charCodeAt(0));

  if (src && !err) {
    return (
      <img src={src} alt={name} onError={() => setErr(true)}
        style={{ width:size, height:size, borderRadius:"50%", objectFit:"cover", flexShrink:0 }} />
    );
  }
  return (
    <div style={{
      width:size, height:size, borderRadius:"50%",
      background:bg, color:"#fff",
      display:"flex", alignItems:"center", justifyContent:"center",
      fontSize:size*0.35, fontWeight:800, flexShrink:0,
      boxShadow:`0 2px 8px ${bg}44`,
    }}>{initials}</div>
  );
}

// ─────────────────────────────────────────────────────────────
//  REQUEST STATS BAR
// ─────────────────────────────────────────────────────────────
function ReqStatsBar({ stats }) {
  if (stats.total === 0) {
    return <div style={{ fontSize:11.5, color:"#94a3b8", fontStyle:"italic", marginTop:4 }}>No requests yet</div>;
  }
  const accPct = Math.round((stats.accepted / stats.total) * 100);
  const decPct = Math.round((stats.declined / stats.total) * 100);
  const penPct = 100 - accPct - decPct;

  return (
    <div style={{ marginTop:7 }}>
      <div style={{ display:"flex", gap:12, flexWrap:"wrap", marginBottom:5 }}>
        {[
          { label:`${stats.total} Total`,    c:"#6366f1" },
          { label:`${stats.accepted} Accepted`, c:"#22c55e" },
          { label:`${stats.pending} Pending`,   c:"#f59e0b" },
          { label:`${stats.declined} Declined`, c:"#ef4444" },
        ].map(s => (
          <span key={s.label} style={{ display:"flex", alignItems:"center", gap:4, fontSize:11.5, fontWeight:700, color:s.c }}>
            <span style={{ width:7, height:7, borderRadius:"50%", background:s.c, display:"inline-block" }}/>
            {s.label}
          </span>
        ))}
      </div>
      <div style={{ height:7, borderRadius:4, background:"#f1f5f9", overflow:"hidden", display:"flex", minWidth:180 }}>
        {accPct > 0 && <div style={{ width:`${accPct}%`, background:"#22c55e", transition:"width .4s" }}/>}
        {penPct > 0 && <div style={{ width:`${penPct}%`, background:"#f59e0b", transition:"width .4s" }}/>}
        {decPct > 0 && <div style={{ width:`${decPct}%`, background:"#ef4444", transition:"width .4s" }}/>}
      </div>
    </div>
  );
}
function fmtDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
  });
}
function fmtDateTime(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}
function colorFor(id) { return AVATAR_COLORS[(Number(id) || 0) % AVATAR_COLORS.length]; }
const AVATAR_COLORS = [
  "#2563eb","#16a34a","#7c3aed","#dc2626",
  "#ea580c","#0891b2","#be185d","#d97706",
  "#059669","#6366f1","#0284c7","#9333ea",
];
function isValidEmail(e) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e); }
function isValidPhone(p) { return /^\d{10}$/.test(String(p).replace(/\s|-/g, "")); }
// Status badge
function SBadge({ status }) {
  const M = {
    approved: ["#dcfce7","#14532d"],
    pending:  ["#fef9c3","#92400e"],
    rejected: ["#fee2e2","#7f1d1d"],
    accepted: ["#dcfce7","#14532d"],
    declined: ["#fee2e2","#7f1d1d"],
    active:   ["#dcfce7","#14532d"],
  };
  const [bg, c] = M[status] || ["#f1f5f9","#64748b"];
  return (
    <span style={{ background:bg, color:c, fontSize:11, fontWeight:700,
      padding:"2px 10px", borderRadius:20 }}>
      {(status||"").charAt(0).toUpperCase()+(status||"").slice(1)}
    </span>
  );
}
function formatDateTime(iso) {
  const d = new Date(iso);
  return d.toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}


// ─────────────────────────────────────────────────────────────
//  BOOKING DETAIL MODAL
// ─────────────────────────────────────────────────────────────
function BookingModal({ booking, onClose }) {
  const rows = [
    { icon:"👤", label:"Client",        val:booking.clientName },
    { icon:"✉️", label:"Email",         val:booking.clientEmail || "—" },
    { icon:"📱", label:"Phone",         val:booking.clientPhone || "—" },
    { icon:"📍", label:"Client City",   val:booking.clientCity  || "—" },
    { icon:"⚖️", label:"Advocate",      val:booking.advocateName },
    { icon:"🏛️", label:"Speciality",    val:booking.advocateSpec || "—" },
    { icon:"📍", label:"Advocate City", val:booking.advocateCity || "—" },
    { icon:"📅", label:"Requested",     val:fmtDateTime(booking.requestedAt) },
    { icon:"✅", label:"Accepted",      val:fmtDateTime(booking.acceptedAt)  },
    { icon:"📂", label:"Case Stage",    val:booking.caseStage || "—" },
    { icon:"📋", label:"Message",       val:booking.message   || "—" },
  ];

  return (
    <div style={{ position:"fixed",inset:0,background:"rgba(0,0,0,.48)",zIndex:500,
      display:"flex",alignItems:"center",justifyContent:"center",padding:16 }}
      onClick={e => e.target===e.currentTarget && onClose()}>
      <div style={{ background:"#fff",borderRadius:14,width:"100%",maxWidth:480,
        maxHeight:"90vh",overflowY:"auto",boxShadow:"0 24px 64px rgba(0,0,0,.22)" }}>
        <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",
          padding:"16px 20px",borderBottom:"1px solid #e2e8f0",
          background:"linear-gradient(135deg,#2563eb,#7c3aed)",borderRadius:"14px 14px 0 0" }}>
          <div>
            <div style={{ fontWeight:800,fontSize:15,color:"#fff" }}>📋 Booking Details</div>
            <div style={{ fontSize:12,color:"rgba(255,255,255,.75)",marginTop:2 }}>
              {booking.clientName} ↔ {booking.advocateName}
            </div>
          </div>
          <button onClick={onClose} style={{ background:"rgba(255,255,255,.2)",border:"none",color:"#fff",
            width:30,height:30,borderRadius:"50%",cursor:"pointer",fontSize:16,
            display:"flex",alignItems:"center",justifyContent:"center" }}>✕</button>
        </div>
        <div style={{ padding:"18px 20px",display:"flex",flexDirection:"column",gap:0 }}>
          {rows.map(r => (
            <div key={r.label} style={{ display:"flex",alignItems:"flex-start",gap:12,
              padding:"9px 0",borderBottom:"1px solid #f1f5f9",fontSize:13.5 }}>
              <span style={{ fontSize:16,width:22,flexShrink:0 }}>{r.icon}</span>
              <span style={{ color:"#64748b",minWidth:110,flexShrink:0 }}>{r.label}</span>
              <span style={{ fontWeight:500,color:"#1e293b",lineHeight:1.5 }}>{r.val}</span>
            </div>
          ))}
        </div>
        <div style={{ padding:"14px 20px",borderTop:"1px solid #e2e8f0",textAlign:"right" }}>
          <button onClick={onClose} style={{ padding:"8px 22px",borderRadius:8,border:"none",
            background:"#2563eb",color:"#fff",fontFamily:"inherit",fontSize:13,fontWeight:700,cursor:"pointer" }}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  CONSULTATION PAYMENT DETAIL MODAL
// ─────────────────────────────────────────────────────────────
function ConsultationModal({ consultation, onClose, onUpdateStatus }) {
  if (!consultation) return null;
  const rows = [
    { icon: "👤", label: "Client Name", val: consultation.clientName },
    { icon: "✉️", label: "Client Email", val: consultation.clientEmail || "—" },
    { icon: "📱", label: "Client Phone", val: consultation.clientPhone || "—" },
    { icon: "📍", label: "Client City", val: consultation.clientCity || "—" },
    { icon: "⚖️", label: "Advocate Name", val: consultation.advocateName },
    { icon: "🏛️", label: "Speciality", val: consultation.advocateSpec || "—" },
    { icon: "📍", label: "Advocate City", val: consultation.advocateCity || "—" },
    { icon: "💰", label: "Platform Fee", val: `₹${consultation.amount || 10}.00` },
    { icon: "🟣", label: "Payment Mode", val: `${consultation.method || "PhonePe UPI"} (${consultation.upiId || "9108717353-3@ybl"})` },
    { icon: "🏷️", label: "Paid Status", val: consultation.status || "Paid" },
    { icon: "📅", label: "Paid / Chat Date", val: fmtDateTime(consultation.paidAt) },
    { icon: "💬", label: "Case Inquiry", val: consultation.message || "—" },
  ];

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,.55)",
        zIndex: 600,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: 16,
          width: "100%",
          maxWidth: 520,
          maxHeight: "92vh",
          overflowY: "auto",
          boxShadow: "0 24px 64px rgba(0,0,0,.25)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "16px 20px",
            borderBottom: "1px solid #e2e8f0",
            background: "linear-gradient(135deg,#008069,#0f766e)",
            borderRadius: "16px 16px 0 0",
          }}
        >
          <div>
            <div style={{ fontWeight: 800, fontSize: 16, color: "#fff" }}>
              💳 PhonePe Consultation Payment Receipt
            </div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,.85)", marginTop: 2 }}>
              {consultation.clientName} ↔ {consultation.advocateName} · ₹{consultation.amount || 10}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "rgba(255,255,255,.2)",
              border: "none",
              color: "#fff",
              width: 32,
              height: 32,
              borderRadius: "50%",
              cursor: "pointer",
              fontSize: 16,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            ✕
          </button>
        </div>

        <div style={{ padding: "18px 22px", display: "flex", flexDirection: "column" }}>
          {rows.map((r) => (
            <div
              key={r.label}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 12,
                padding: "9px 0",
                borderBottom: "1px solid #f1f5f9",
                fontSize: 13.5,
              }}
            >
              <span style={{ fontSize: 16, width: 22, flexShrink: 0 }}>{r.icon}</span>
              <span style={{ color: "#64748b", minWidth: 125, flexShrink: 0, fontWeight: 500 }}>
                {r.label}
              </span>
              <span style={{ color: "#0f172a", fontWeight: 600, wordBreak: "break-word" }}>
                {r.label === "Paid Status" ? (
                  <span
                    style={{
                      background: (consultation.status || "").toLowerCase() === "paid" ? "#dcfce7" : "#fef9c3",
                      color: (consultation.status || "").toLowerCase() === "paid" ? "#14532d" : "#92400e",
                      padding: "2px 8px",
                      borderRadius: 12,
                      fontSize: 12,
                      fontWeight: 700,
                    }}
                  >
                    ✓ {r.val}
                  </span>
                ) : (
                  r.val
                )}
              </span>
            </div>
          ))}

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 18 }}>
            <button
              className="am-btn-secondary"
              onClick={onClose}
              style={{ padding: "8px 16px", borderRadius: 8, cursor: "pointer" }}
            >
              Close
            </button>
            {onUpdateStatus && (
              <button
                className="am-btn-approve"
                onClick={() => {
                  const nextStatus = (consultation.status || "").toLowerCase() === "paid" ? "Pending" : "Paid";
                  onUpdateStatus(consultation.id, nextStatus);
                  onClose();
                }}
                style={{ padding: "8px 16px", borderRadius: 8, cursor: "pointer" }}
              >
                {(consultation.status || "").toLowerCase() === "paid" ? "Mark as Pending" : "✓ Mark as Paid"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  SIDEBAR NAVIGATION
// ─────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────
//  CLIENT DETAIL MODAL — Full details of the selected client & chosen advocate
// ─────────────────────────────────────────────────────────────
function ClientDetailModal({ client, consultations, bookings, onClose, onEdit, onApprove, onReject, onDelete, onUpdateConsultStatus }) {
  if (!client) return null;

  const clientCons = (consultations || []).filter(c => {
    const matchId = client.id && (Number(c.clientId) === Number(client.id) || String(c.clientId) === String(client.id));
    const matchName = client.name && (c.clientName || "").toLowerCase().trim() === String(client.name).toLowerCase().trim();
    return matchId || matchName;
  });

  const clientBookings = Object.values(bookings || {}).filter(b =>
    (b.clientName || "").toLowerCase().trim() === String(client.name || "").toLowerCase().trim() ||
    (client.phone && b.clientPhone === client.phone)
  );

  const totalPaid = clientCons
    .filter(c => (c.status || c.paymentStatus || "").toLowerCase() === "paid")
    .reduce((sum, c) => sum + (Number(c.amount) || 10), 0);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,.6)",
        zIndex: 650,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: 16,
          width: "100%",
          maxWidth: 620,
          maxHeight: "92vh",
          overflowY: "auto",
          boxShadow: "0 24px 64px rgba(0,0,0,.25)",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "18px 24px",
            borderBottom: "1px solid #e2e8f0",
            background: "linear-gradient(135deg, #1e293b, #0f172a)",
            color: "#fff",
            borderRadius: "16px 16px 0 0",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <Avi name={client.name} size={48} />
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <span style={{ fontWeight: 800, fontSize: 18 }}>{client.name}</span>
                <span style={{ fontSize: 11, background: "rgba(255,255,255,0.2)", padding: "2px 8px", borderRadius: 12 }}>
                  Client #{client.id}
                </span>
                <SBadge status={client.status || "approved"} />
              </div>
              <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>
                Registered: {fmtDate(client.createdAt)} · Total Fee Paid: ₹{totalPaid}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "rgba(255,255,255,.15)",
              border: "none",
              color: "#fff",
              width: 32,
              height: 32,
              borderRadius: "50%",
              cursor: "pointer",
              fontSize: 16,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Client Profile Details */}
          <div>
            <h4 style={{ margin: "0 0 10px 0", fontSize: 13, textTransform: "uppercase", letterSpacing: 0.5, color: "#64748b" }}>
              👤 Client Contact &amp; Profile Details
            </h4>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12, background: "#f8fafc", padding: 14, borderRadius: 10, border: "1px solid #e2e8f0" }}>
              <div>
                <span style={{ fontSize: 11, color: "#64748b", display: "block" }}>Full Name</span>
                <strong style={{ fontSize: 14, color: "#1e293b" }}>{client.name}</strong>
              </div>
              <div>
                <span style={{ fontSize: 11, color: "#64748b", display: "block" }}>Email Address</span>
                <strong style={{ fontSize: 13, color: "#1e293b" }}>{client.email || "—"}</strong>
              </div>
              <div>
                <span style={{ fontSize: 11, color: "#64748b", display: "block" }}>Phone Number</span>
                <strong style={{ fontSize: 13, color: "#1e293b" }}>{client.phone ? `📞 ${client.phone}` : "—"}</strong>
              </div>
              <div>
                <span style={{ fontSize: 11, color: "#64748b", display: "block" }}>Location / City</span>
                <strong style={{ fontSize: 13, color: "#1e293b" }}>📍 {client.city || "Gokak, Karnataka"}</strong>
              </div>
            </div>
          </div>

          {/* Selected Advocate & Paid Consultations */}
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10, flexWrap: "wrap", gap: 6 }}>
              <h4 style={{ margin: 0, fontSize: 13, textTransform: "uppercase", letterSpacing: 0.5, color: "#64748b" }}>
                ⚖️ Selected Advocate &amp; ₹10 Paid Consultations ({clientCons.length})
              </h4>
              <span style={{ fontSize: 11, color: "#059669", fontWeight: 700 }}>
                PhonePe: 9108717353-3@ybl
              </span>
            </div>

            {clientCons.length === 0 ? (
              <div style={{ background: "#f8fafc", padding: 16, borderRadius: 10, border: "1px dashed #cbd5e1", textAlign: "center", color: "#64748b", fontSize: 13 }}>
                This client has not selected an advocate or paid for a consultation chat yet.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {clientCons.map((con) => {
                  const isPaid = (con.status || con.paymentStatus || "").toLowerCase() === "paid";
                  return (
                    <div
                      key={con.id}
                      style={{
                        background: "#fff",
                        border: "1px solid #e2e8f0",
                        borderRadius: 12,
                        padding: "14px 16px",
                        boxShadow: "0 2px 4px rgba(0,0,0,0.03)",
                        display: "flex",
                        flexDirection: "column",
                        gap: 10,
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <Avi name={con.advocateName} color={colorFor(con.advocateId)} size={40} />
                          <div>
                            <div style={{ fontWeight: 700, fontSize: 15, color: "#0f172a" }}>
                              Adv. {con.advocateName}
                            </div>
                            <div style={{ fontSize: 12, color: "#64748b" }}>
                              {con.advocateSpec || "Advocate & Legal Consultant"} · {con.advocateCity || "Karnataka"}
                            </div>
                          </div>
                        </div>

                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span
                            style={{
                              background: isPaid ? "#dcfce7" : "#fef9c3",
                              color: isPaid ? "#14532d" : "#92400e",
                              padding: "4px 10px",
                              borderRadius: 14,
                              fontSize: 12,
                              fontWeight: 700,
                            }}
                          >
                            {isPaid ? `✅ Paid ₹${con.amount || 10}` : "⏳ Pending"}
                          </span>
                          {onUpdateConsultStatus && (
                            <button
                              type="button"
                              onClick={() => onUpdateConsultStatus(con.id, isPaid ? "Pending" : "Paid")}
                              style={{
                                background: "#f1f5f9",
                                border: "1px solid #cbd5e1",
                                padding: "4px 8px",
                                borderRadius: 6,
                                fontSize: 11,
                                cursor: "pointer",
                                fontWeight: 600,
                              }}
                            >
                              {isPaid ? "Mark Pending" : "Mark Paid"}
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Payment Details */}
                      <div
                        style={{
                          background: "#f8fafc",
                          borderRadius: 8,
                          padding: "8px 12px",
                          display: "flex",
                          flexWrap: "wrap",
                          justifyContent: "space-between",
                          gap: 8,
                          fontSize: 12,
                          color: "#475569",
                        }}
                      >
                        <span>📱 PhonePe: <b>{con.phonePeNumber || "9108717353"}</b></span>
                        <span>UPI ID: <b>{con.upiId || "9108717353-3@ybl"}</b></span>
                        <span>Txn: <b>{con.transactionId || con.id}</b></span>
                        <span>🕒 {fmtDateTime(con.paidAt || con.createdAt)}</span>
                      </div>

                      {/* Case inquiry message */}
                      {con.message && (
                        <div
                          style={{
                            background: "#fffbeb",
                            border: "1px solid #fef3c7",
                            color: "#92400e",
                            borderRadius: 8,
                            padding: "8px 12px",
                            fontSize: 12.5,
                          }}
                        >
                          💬 <b>Case Details / Inquiry:</b> &ldquo;{con.message}&rdquo;
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Bookings & Stages */}
          {clientBookings.length > 0 && (
            <div>
              <h4 style={{ margin: "0 0 10px 0", fontSize: 13, textTransform: "uppercase", letterSpacing: 0.5, color: "#64748b" }}>
                📂 Case Bookings &amp; Stages ({clientBookings.length})
              </h4>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {clientBookings.map((b, i) => (
                  <div key={i} style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>⚖️ Adv. {b.advocateName}</div>
                      <div style={{ fontSize: 11.5, color: "#64748b" }}>Requested: {fmtDate(b.requestedAt)} · Accepted: {fmtDate(b.acceptedAt)}</div>
                    </div>
                    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                      <SBadge status={b.status} />
                      <span className="am-stage-pill">{b.caseStage || "Start Case"}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid #e2e8f0", paddingTop: 16, flexWrap: "wrap", gap: 10 }}>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {client.status === "pending" && onApprove && (
                <button className="am-btn-approve" onClick={() => { onApprove(client.id); onClose(); }}>
                  ✓ Approve Client
                </button>
              )}
              {client.status === "pending" && onReject && (
                <button className="am-btn-reject" onClick={() => { onReject(client.id); onClose(); }}>
                  ✕ Reject Client
                </button>
              )}
              {onEdit && (
                <button className="am-btn-secondary" onClick={() => { onEdit(client); onClose(); }}>
                  ✏️ Edit Client
                </button>
              )}
              {onDelete && (
                <button className="am-btn-danger" onClick={() => { onDelete(client); onClose(); }}>
                  🗑️ Delete Client
                </button>
              )}
            </div>
            <button className="am-btn-primary" onClick={onClose}>
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Client edit modal (admin)
function ClientEditModal({ client, onClose, onSave }) {
  const [form, setForm] = useState({
    name: client?.name || "",
    email: client?.email || "",
    phone: client?.phone || "",
    city: client?.city || "",
    status: client?.status || "pending",
  });

  useEffect(() => setForm({
    name: client?.name || "",
    email: client?.email || "",
    phone: client?.phone || "",
    city: client?.city || "",
    status: client?.status || "pending",
    password: "",
  }), [client]);

  return (
    <div className="am-modal-overlay" onClick={onClose}>
      <div className="am-modal" onClick={(e) => e.stopPropagation()}>
        <div className="am-modal-header">
          <h3>Edit client</h3>
          <button className="am-modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="am-form-row">
          <label>Name</label>
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </div>
        <div className="am-form-row">
          <label>Email</label>
          <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </div>
        <div className="am-form-row">
          <label>Phone</label>
          <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        </div>
        <div className="am-form-row">
          <label>City</label>
          <input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
        </div>
        <div className="am-form-row">
          <label>Status</label>
          <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
            <option value="pending">pending</option>
            <option value="approved">approved</option>
            <option value="rejected">rejected</option>
          </select>
        </div>
        <div className="am-form-row">
          <label>Set password (optional)</label>
          <input type="text" placeholder="Leave blank to keep current password" value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })} />
        </div>
        <div className="am-modal-actions">
          <button className="am-btn-secondary" onClick={onClose}>Cancel</button>
          <button className="am-btn-primary" onClick={() => onSave(form)}>Save</button>
        </div>
      </div>
    </div>
  );
}

// Client add modal (admin adding client directly into clients.json)
function ClientAddModal({ advocates, onClose, onSave }) {
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    city: "Gokak",
    password: "client123",
    status: "approved",
    advocateId: "",
    message: "",
    paymentStatus: "Paid",
    amount: 10,
  });
  const [error, setError] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name.trim()) return setError("Client name is required");
    if (!form.email.trim()) return setError("Client email is required");
    if (form.password && form.password.length < 6) return setError("Password must be at least 6 characters");
    setError("");
    onSave(form);
  };

  return (
    <div className="am-modal-overlay" onClick={onClose}>
      <div className="am-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 520 }}>
        <div className="am-modal-header">
          <h3>➕ Add New Client to clients.json</h3>
          <button className="am-modal-close" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12, padding: "16px 20px" }}>
          {error && <div style={{ color: "#ef4444", fontSize: 13, background: "#fee2e2", padding: "8px 12px", borderRadius: 6 }}>⚠ {error}</div>}
          
          <div className="am-form-row">
            <label>Client Full Name *</label>
            <input 
              required 
              placeholder="e.g. Ramesh Kulkarni" 
              value={form.name} 
              onChange={(e) => setForm({ ...form, name: e.target.value })} 
            />
          </div>

          <div className="am-form-row">
            <label>Email Address *</label>
            <input 
              required 
              type="email" 
              placeholder="e.g. ramesh@gmail.com" 
              value={form.email} 
              onChange={(e) => setForm({ ...form, email: e.target.value })} 
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div className="am-form-row">
              <label>Phone Number</label>
              <input 
                placeholder="e.g. 9876543210" 
                value={form.phone} 
                onChange={(e) => setForm({ ...form, phone: e.target.value })} 
              />
            </div>
            <div className="am-form-row">
              <label>City / Location</label>
              <input 
                placeholder="e.g. Gokak" 
                value={form.city} 
                onChange={(e) => setForm({ ...form, city: e.target.value })} 
              />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div className="am-form-row">
              <label>Initial Password</label>
              <input 
                placeholder="client123" 
                value={form.password} 
                onChange={(e) => setForm({ ...form, password: e.target.value })} 
              />
            </div>
            <div className="am-form-row">
              <label>Account Status</label>
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                <option value="approved">Approved</option>
                <option value="pending">Pending</option>
              </select>
            </div>
          </div>

          {/* Optional Advocate Consultation Setup */}
          <div style={{ borderTop: "1px dashed var(--adm-border)", paddingTop: 12, marginTop: 4 }}>
            <label style={{ fontSize: 13, fontWeight: 700, display: "block", marginBottom: 6 }}>
              ⚖️ Initial Advocate Consultation (Optional)
            </label>
            <div className="am-form-row">
              <select 
                value={form.advocateId} 
                onChange={(e) => setForm({ ...form, advocateId: e.target.value })}
                style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid var(--adm-border)" }}
              >
                <option value="">-- No consultation initial setup --</option>
                {(advocates || []).filter(a => a.status === "approved").map((a) => (
                  <option key={a.id} value={a.id}>
                    Adv. {a.name} ({a.speciality || a.practiceArea || "Lawyer"} · {a.city})
                  </option>
                ))}
              </select>
            </div>

            {form.advocateId && (
              <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 8 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div className="am-form-row">
                    <label>Fee Status</label>
                    <select value={form.paymentStatus} onChange={(e) => setForm({ ...form, paymentStatus: e.target.value })}>
                      <option value="Paid">✅ Paid (₹10 PhonePe)</option>
                      <option value="Pending">⏳ Pending</option>
                    </select>
                  </div>
                  <div className="am-form-row">
                    <label>Amount (₹)</label>
                    <input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
                  </div>
                </div>
                <div className="am-form-row">
                  <label>Case / Inquiry Note</label>
                  <input 
                    placeholder="e.g. Legal assistance for civil property dispute" 
                    value={form.message} 
                    onChange={(e) => setForm({ ...form, message: e.target.value })} 
                  />
                </div>
              </div>
            )}
          </div>

          <div className="am-modal-actions" style={{ marginTop: 8 }}>
            <button type="button" className="am-btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="am-btn-primary">💾 Add Client to clients.json</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  REQUEST DETAIL MODAL (per advocate)
// ─────────────────────────────────────────────────────────────
function ReqDetailModal({ adv, allReqs, onClose, onStatusChange }) {
  const [filter,  setFilter]  = useState("all");
  const [saving,  setSaving]  = useState(null);
  const list = (allReqs[adv.id] || []).filter(r =>
    filter === "all" ? true : r.status === filter
  );
  const stats = getReqStats(adv.id, allReqs);

  const handleChange = async (req, newStatus) => {
    setSaving(req.id || req.clientName);
    await new Promise(r => setTimeout(r, 400));
    onStatusChange(adv.id, req, newStatus);
    setSaving(null);
  };

  return (
    <div style={{ position:"fixed",inset:0,background:"rgba(0,0,0,.48)",zIndex:500,
      display:"flex",alignItems:"center",justifyContent:"center",padding:16 }}
      onClick={e => e.target===e.currentTarget && onClose()}>
      <div style={{ background:"#fff",borderRadius:14,width:"100%",maxWidth:560,
        maxHeight:"90vh",overflowY:"auto",boxShadow:"0 24px 64px rgba(0,0,0,.22)",
        display:"flex",flexDirection:"column" }}>

        {/* Header */}
        <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",
          padding:"16px 20px",borderBottom:"1px solid #e2e8f0",flexShrink:0 }}>
          <div style={{ display:"flex",alignItems:"center",gap:10 }}>
            <Avi name={adv.name} color={colorFor(adv.id)} size={40} src={adv.avatar||adv.image} />
            <div>
              <div style={{ fontWeight:700,fontSize:15 }}>{adv.name}</div>
              <div style={{ fontSize:12,color:"#64748b" }}>{adv.speciality||adv.practiceArea} · {adv.city||adv.location}</div>
            </div>
          </div>
          <button onClick={onClose} style={{ background:"none",border:"none",cursor:"pointer",fontSize:18,color:"#94a3b8" }}>✕</button>
        </div>

        {/* Stats strip */}
        <div style={{ display:"flex",gap:0,borderBottom:"1px solid #e2e8f0",flexShrink:0 }}>
          {[
            { label:"Total",    val:stats.total,    c:"#6366f1" },
            { label:"Pending",  val:stats.pending,  c:"#f59e0b" },
            { label:"Accepted", val:stats.accepted, c:"#22c55e" },
            { label:"Declined", val:stats.declined, c:"#ef4444" },
          ].map(s => (
            <div key={s.label} style={{ flex:1,textAlign:"center",padding:"12px 6px",
              borderRight:"1px solid #e2e8f0",borderTop:`3px solid ${s.c}` }}>
              <div style={{ fontSize:20,fontWeight:800,color:s.c }}>{s.val}</div>
              <div style={{ fontSize:11,color:"#64748b",marginTop:2 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Filter tabs */}
        <div style={{ display:"flex",gap:4,padding:"10px 16px",borderBottom:"1px solid #e2e8f0",flexShrink:0,background:"#fafbff" }}>
          {["all","pending","accepted","declined"].map(f=>(
            <button key={f} onClick={()=>setFilter(f)}
              style={{ padding:"6px 14px",borderRadius:7,border:"none",fontSize:12.5,fontWeight:filter===f?700:500,
                fontFamily:"inherit",cursor:"pointer",
                background:filter===f?"#2563eb":"transparent",
                color:filter===f?"#fff":"#64748b",transition:"all .15s" }}>
              {f.charAt(0).toUpperCase()+f.slice(1)}
            </button>
          ))}
        </div>

        {/* Request list */}
        <div style={{ padding:"12px 16px",flex:1,overflowY:"auto",display:"flex",flexDirection:"column",gap:10 }}>
          {list.length === 0 ? (
            <div style={{ textAlign:"center",padding:"32px",color:"#94a3b8",fontSize:14 }}>
              No {filter!=="all"?filter:""} requests
            </div>
          ) : list.map((req, i) => (
            <div key={i} style={{ background:"#f8fafc",border:"1px solid #e2e8f0",borderRadius:9,padding:"12px 14px" }}>
              <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6 }}>
                <div style={{ display:"flex",alignItems:"center",gap:8 }}>
                  <Avi name={req.clientName} size={32} />
                  <div>
                    <div style={{ fontWeight:700,fontSize:13.5 }}>{req.clientName}</div>
                    <div style={{ fontSize:11.5,color:"#64748b" }}>{fmtDate(req.requestedAt)}</div>
                  </div>
                </div>
                <SBadge status={req.status} />
              </div>
              {req.clientPhone && <div style={{ fontSize:12,color:"#64748b",marginBottom:2 }}>📱 {req.clientPhone}</div>}
              {req.clientEmail && <div style={{ fontSize:12,color:"#64748b",marginBottom:2 }}>✉️ {req.clientEmail}</div>}
              {req.message && (
                <div style={{ fontSize:12.5,color:"#475569",marginTop:6,padding:"8px",background:"#fff",borderRadius:7,border:"1px solid #e2e8f0" }}>
                  {req.message.slice(0,120)}{req.message.length>120?"…":""}
                </div>
              )}
              {req.status === "pending" && (
                <div style={{ display:"flex",gap:7,marginTop:10 }}>
                  <button onClick={() => handleChange(req, "accepted")} disabled={saving===req.id}
                    style={{ flex:1,background:"#16a34a",color:"#fff",border:"none",borderRadius:7,
                      padding:"7px",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit" }}>
                    {saving===req.id ? "…" : "✅ Accept"}
                  </button>
                  <button onClick={() => handleChange(req, "declined")} disabled={saving===req.id}
                    style={{ flex:1,background:"#fee2e2",color:"#dc2626",border:"1px solid #fecaca",borderRadius:7,
                      padding:"7px",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit" }}>
                    ❌ Decline
                  </button>
                </div>
              )}
              {req.status === "accepted" && req.acceptedAt && (
                <div style={{ fontSize:11.5,color:"#16a34a",marginTop:6,fontWeight:600 }}>
                  ✓ Accepted {fmtDate(req.acceptedAt)}
                  {req.caseStage && ` · Stage: ${req.caseStage}`}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}


// ── Admin Login Gate ────────────────────────────────────────
// ── Theme (light / dark), remembered per browser ────────────
function useAdminTheme() {
  const [theme, setTheme] = useState(getTheme);

  useEffect(() => {
    const handle = (e) => {
      setTheme(e?.detail || getTheme());
    };
    window.addEventListener("law4u_theme_change", handle);
    return () => window.removeEventListener("law4u_theme_change", handle);
  }, []);

  const toggle = useCallback(() => {
    const next = toggleGlobalTheme();
    setTheme(next);
  }, []);

  return [theme, toggle];
}

// Persisted boolean preference (rail expanded / collapsed)
const RAIL_KEY = "law4u_admin_rail";

function useStoredFlag(key, initial) {
  const [value, setValue] = useState(() => {
    try {
      const saved = localStorage.getItem(key);
      if (saved === "1" || saved === "0") return saved === "1";
    } catch { /* storage unavailable */ }
    return initial;
  });
  useEffect(() => {
    try { localStorage.setItem(key, value ? "1" : "0"); } catch { /* ignore */ }
  }, [key, value]);
  const toggle = useCallback(() => setValue((v) => !v), []);
  return [value, toggle];
}

function ThemeToggle({ theme, onToggle }) {
  const dark = theme === "dark";
  return (
    <button
      type="button"
      className="am-theme-btn"
      onClick={onToggle}
      aria-label={dark ? "Switch to light theme" : "Switch to dark theme"}
      title={dark ? "Light theme" : "Dark theme"}
    >
      {dark ? (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>
      ) : (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" /></svg>
      )}
    </button>
  );
}

function AdminLogin({ onLogin, theme, onToggleTheme }) {
  const [form, setForm] = useState({ email: "", password: "" });
  const [err, setErr]   = useState("");
  const [showPw, setShowPw] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const em = form.email.trim().toLowerCase();
    const pw = form.password;
    if (!em || !pw) {
      setErr("Please enter both email and password.");
      return;
    }
    try {
      const { token } = await api("/api/auth/admin/login", {
        method: "POST",
        body: { email: em, password: pw },
      });
      setAdminToken(token);
      setErr("");
      onLogin();
    } catch (error) {
      const isServerDown = error.status === 500 || !error.status || error.message.includes("500") || error.message.includes("Failed to fetch");
      const isMatch = (em === "admin@law4u.in" || em === "admin@gmail.com" || em.includes("admin")) &&
                      (pw === "Admin@123" || pw === "admin123" || pw === "admin");

      if (isServerDown && isMatch) {
        setAdminToken("offline-admin-token");
        setErr("");
        onLogin();
        return;
      }

      if (error.status === 401) {
        setErr("Invalid admin email or password.");
      } else if (isServerDown) {
        setErr("Backend server is offline (port 5000). Start it with: node backend/server.js (or login with admin@law4u.in / Admin@123)");
      } else {
        setErr(error.message || "Request failed");
      }
    }
  };

  return (
    <div className={`am-login-page ${theme === "dark" ? "am-dark" : ""}`}>
      <ThemeToggle theme={theme} onToggle={onToggleTheme} />
      <form className="am-login-card" onSubmit={handleSubmit}>
        <BrandLogo size={56} wordmark={false} style={{ margin: "0 auto" }} />
        <h1 className="am-login-title">Admin Console</h1>
        <p className="am-login-sub">Law4u — Advocate Management</p>

        <div className="am-field">
          <label>Admin Email</label>
          <input
            type="email"
            placeholder="admin@law4u.in"
            value={form.email}
            onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
          />
        </div>

        <div className="am-field">
          <label>Password</label>
          <div className="am-pw-wrap">
            <input
              type={showPw ? "text" : "password"}
              placeholder="Enter admin password"
              value={form.password}
              onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
            />
            <button type="button" className="am-eye" onClick={() => setShowPw((p) => !p)}>
              {showPw ? "🙈" : "👁️"}
            </button>
          </div>
        </div>

        {err && <p className="am-err">⚠ {err}</p>}

        <button type="submit" className="am-btn-primary">Login to Admin →</button>

        <Link to="/" className="am-back-link">← Back to site</Link>
      </form>
    </div>
  );
}

// ── Stat card ───────────────────────────────────────────────
function StatCard({ icon, label, value, tone, hint }) {
  return (
    <div className={`am-stat-card ${tone || ""}`}>
      {icon && <div className="am-stat-icon">{icon}</div>}
      <div style={{ minWidth: 0 }}>
        <div className="am-stat-value">{value}</div>
        <div className="am-stat-label">{label}</div>
        {hint && <div className="am-stat-hint">{hint}</div>}
      </div>
    </div>
  );
}

// ── Icon rail (mirrors the tabs; same setTab handlers) ─────
const RAIL_ICONS = {
  pending:   <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 8v4l3 2" /><circle cx="12" cy="12" r="9" /></svg>,
  all:       <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20a6.5 6.5 0 0 1 13 0" /><path d="M16 4.5a3.5 3.5 0 0 1 0 7" /><path d="M17 13.5a6.5 6.5 0 0 1 4.5 6.5" /></svg>,
  consultations: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="2" y="5" width="20" height="14" rx="2" /><line x1="2" y1="10" x2="22" y2="10" /><path d="M7 15h2M12 15h5" /></svg>,
  clients:   <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>,
  messages:  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 7l9 6 9-6" /></svg>,
  questions: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.3-1 .8-1 1.7" /><path d="M12 17h.01" /></svg>,
  bookings:  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></svg>,
  requests:  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h10" /></svg>,
  logout:    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M10 4H5v16h5M14 8l4 4-4 4M18 12H9" /></svg>,
  collapse:  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 6l-6 6 6 6" /></svg>,
  expand:    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6" /></svg>,
};

function RailButton({ id, label, tab, setTab, count }) {
  return (
    <button
      type="button"
      className={`am-rail-btn ${tab === id ? "active" : ""}`}
      onClick={() => setTab(id)}
      aria-label={label}
      title={label}
      aria-current={tab === id ? "page" : undefined}
    >
      {RAIL_ICONS[id]}
      <span className="am-rail-label">{label}</span>
      {count > 0 && <span className="am-rail-dot">{count}</span>}
    </button>
  );
}

// ── Advocate row (All Advocates tab) ───────────────────────
function AdvocateRow({ adv, onEdit, onDelete }) {
  const STATUS_MAP = {
    approved: { bg: "#dcfce7", c: "#14532d", label: "Approved" },
    pending:  { bg: "#fef3c7", c: "#92400e", label: "Pending" },
    rejected: { bg: "#fee2e2", c: "#7f1d1d", label: "Rejected" },
  };
  const s = STATUS_MAP[adv.status] || STATUS_MAP.pending;

  return (
    <div className="am-row">
      <div className="am-row-main">
        <div className="am-row-avatar">{adv.name.replace(/^Adv\.\s*/i, "").split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}</div>
        <div>
          <div className="am-row-name">{adv.name}</div>
          <div className="am-row-sub" style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center", marginTop: 2 }}>
            <span style={{ color: "#334155", fontWeight: 600 }}>{adv.speciality || adv.practiceArea || "General Practice"}</span>
            {adv.city && <span style={{ color: "#64748b" }}>· 📍 {adv.city}</span>}
            {adv.court && (
              <span style={{ fontSize: 11, background: "#eff6ff", color: "#1e40af", padding: "1px 8px", borderRadius: 8, border: "1px solid #bfdbfe", fontWeight: 600 }}>
                🏛️ {adv.court}
              </span>
            )}
          </div>
        </div>
      </div>
      <div className="am-row-contact">
        <div>{adv.email}</div>
        <div>{adv.phone}</div>
      </div>
      <span className="am-status-pill" style={{ background: s.bg, color: s.c }}>{s.label}</span>
      <div className="am-row-actions">
        <button className="am-btn-edit" onClick={() => onEdit(adv)}>✎ Edit</button>
        <button className="am-btn-delete" onClick={() => onDelete(adv)}>🗑 Delete</button>
      </div>
    </div>
  );
}

// ── Pending approval card ──────────────────────────────────
function PendingCard({ adv, onApprove, onReject, onEdit }) {
  const specs = Array.isArray(adv.practiceAreas) && adv.practiceAreas.length > 0
    ? adv.practiceAreas
    : (adv.speciality || adv.practiceArea ? (adv.speciality || adv.practiceArea).split(/,\s*/).filter(Boolean) : []);

  return (
    <div className="am-pending-card" style={{
      background: "#ffffff",
      borderRadius: 14,
      border: "1px solid #e2e8f0",
      boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
      padding: "18px 20px",
      display: "flex",
      flexDirection: "column",
      gap: 12,
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div className="am-row-main" style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div className="am-row-avatar">{adv.name.replace(/^Adv\.\s*/i, "").split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}</div>
          <div>
            <div className="am-row-name" style={{ fontSize: 16, fontWeight: 800, color: "#0f172a" }}>{adv.name}</div>
            <div className="am-row-sub" style={{ fontSize: 13, color: "#64748b" }}>
              {adv.city ? `📍 ${adv.city}` : ""} {adv.experience ? `· ${adv.experience}` : ""}
            </div>
          </div>
        </div>

        <span style={{
          background: "#fef9c3",
          color: "#854d0e",
          fontSize: 11.5,
          fontWeight: 700,
          padding: "3px 10px",
          borderRadius: 16,
          border: "1px solid #fef08a",
        }}>
          ⏳ Awaiting Approval
        </span>
      </div>

      {/* Selected Practice Areas Badge Strip */}
      {specs.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Fields:</span>
          {specs.map(s => (
            <span key={s} style={{
              fontSize: 11.5,
              background: "#eff6ff",
              color: "#1e40af",
              padding: "2px 8px",
              borderRadius: 12,
              fontWeight: 600,
              border: "1px solid #dbeafe"
            }}>
              ⚖️ {s}
            </span>
          ))}
        </div>
      )}

      {/* Selected Jurisdiction Box (Target Court & Dependencies) */}
      {(adv.court || adv.courtLevel || adv.district || adv.taluk) && (
        <div style={{
          background: "linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%)",
          border: "1px solid #86efac",
          borderRadius: 10,
          padding: "10px 14px",
          display: "flex",
          flexDirection: "column",
          gap: 6,
        }}>
          <div style={{ fontSize: 13.5, fontWeight: 800, color: "#0f172a", display: "flex", alignItems: "center", gap: 6 }}>
            <span>🏛️</span>
            <span>{adv.court || "Target Court"}</span>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, fontSize: 11.5 }}>
            {adv.courtLevel && (
              <span style={{ color: "#1e3a8a", background: "#ffffff", padding: "2px 8px", borderRadius: 12, fontWeight: 600, border: "1px solid #bfdbfe" }}>
                Level: <strong>{adv.courtLevel}</strong>
              </span>
            )}
            {adv.district && (
              <span style={{ color: "#065f46", background: "#ffffff", padding: "2px 8px", borderRadius: 12, fontWeight: 600, border: "1px solid #a7f3d0" }}>
                District: <strong>{adv.district}</strong>
              </span>
            )}
            {adv.taluk && (
              <span style={{ color: "#7c2d12", background: "#ffffff", padding: "2px 8px", borderRadius: 12, fontWeight: 600, border: "1px solid #fed7aa" }}>
                Taluk: <strong>{adv.taluk}</strong>
              </span>
            )}
          </div>
        </div>
      )}

      <div className="am-pending-details" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 8, fontSize: 12.5 }}>
        <div><strong>Email:</strong> {adv.email}</div>
        <div><strong>Phone:</strong> {adv.phone}</div>
        <div><strong>Bar ID:</strong> {adv.barId || "—"}</div>
        <div><strong>Fee:</strong> {adv.fee || "—"}</div>
      </div>

      {adv.bio && (
        <p className="am-pending-bio" style={{ fontSize: 12.5, color: "#475569", background: "#f8fafc", padding: "8px 12px", borderRadius: 8, margin: 0, fontStyle: "italic" }}>
          "{adv.bio}"
        </p>
      )}

      <div className="am-pending-actions" style={{ display: "flex", gap: 8, marginTop: 4 }}>
        <button className="am-btn-approve" onClick={() => onApprove(adv.id)}>✓ Approve</button>
        <button className="am-btn-reject" onClick={() => onReject(adv.id)}>✕ Reject</button>
        <button className="am-btn-edit" onClick={() => onEdit(adv)}>✎ Edit first</button>
      </div>
    </div>
  );
}

// ── Add / Edit modal ────────────────────────────────────────
function AdvocateFormModal({ initial, onClose, onSave }) {
  const isEdit = Boolean(initial);
  const [form, setForm] = useState(() => {
    if (!initial) return EMPTY_FORM;
    const cl = initial.courtLevel || (initial.court?.includes("High Court") ? "High Court" : (initial.court?.includes("Supreme Court") ? "Supreme Court" : (initial.court ? "Taluk / JMFC / Civil Court" : "")));
    const dist = initial.district || "";
    const tlk = initial.taluk || "";
    return {
      ...EMPTY_FORM,
      ...initial,
      courtLevel: cl,
      district: dist,
      taluk: tlk,
      password: "",
    };
  });
  const [err, setErr] = useState({});
  const initialSpecs = Array.isArray(initial?.practiceAreas)
    ? initial.practiceAreas
    : (initial?.speciality || initial?.practiceArea ? (initial.speciality || initial.practiceArea).split(/,\s*/).map(s => s.trim()).filter(Boolean) : []);
  const [specialities, setSpecialities] = useState(initialSpecs);
  const [customArea, setCustomArea] = useState("");

  const setF = (k, v) => {
    setForm((p) => ({ ...p, [k]: v }));
    setErr((p) => ({ ...p, [k]: "" }));
  };

  const handleCourtLevelChange = (level) => {
    setForm((prev) => {
      let nextDistrict = prev.district;
      let nextTaluk = prev.taluk;
      let nextBench = prev.bench;
      let nextCity = prev.city;

      if (level === "Supreme Court") {
        nextDistrict = "New Delhi";
        nextTaluk = "New Delhi";
        nextBench = "";
        nextCity = "New Delhi";
      } else if (level === "High Court") {
        nextDistrict = "";
        nextTaluk = "";
        if (!nextBench) nextBench = HIGH_COURT_BENCHES[0];
        nextCity = nextBench.includes("Dharwad") ? "Dharwad" : (nextBench.includes("Kalaburagi") ? "Kalaburagi" : "Bengaluru");
      } else {
        nextBench = "";
        if (nextDistrict === "New Delhi") nextDistrict = "";
        if (nextTaluk === "New Delhi") nextTaluk = "";
      }

      const computedCourt = buildTargetCourt({
        courtLevel: level,
        district: nextDistrict,
        taluk: nextTaluk,
        bench: nextBench,
      });

      return {
        ...prev,
        courtLevel: level,
        district: nextDistrict,
        taluk: nextTaluk,
        bench: nextBench,
        court: computedCourt,
        city: nextCity || nextTaluk || nextDistrict || prev.city,
      };
    });
    setErr((p) => ({ ...p, courtLevel: "", court: "", district: "", taluk: "" }));
  };

  const handleDistrictChange = (dist) => {
    setForm((prev) => {
      const taluks = getTaluksForDistrict(dist);
      const nextTaluk = taluks.includes(prev.taluk) ? prev.taluk : (taluks.length > 0 ? taluks[0] : "");
      const nextCity = nextTaluk || dist || "";
      const computedCourt = buildTargetCourt({
        courtLevel: prev.courtLevel,
        district: dist,
        taluk: nextTaluk,
        bench: prev.bench,
      });
      return {
        ...prev,
        district: dist,
        taluk: nextTaluk,
        court: computedCourt,
        city: nextCity,
      };
    });
    setErr((p) => ({ ...p, district: "", court: "" }));
  };

  const handleTalukChange = (tlk) => {
    setForm((prev) => {
      const computedCourt = buildTargetCourt({
        courtLevel: prev.courtLevel,
        district: prev.district,
        taluk: tlk,
        bench: prev.bench,
      });
      return {
        ...prev,
        taluk: tlk,
        court: computedCourt,
        city: tlk || prev.district || prev.city,
      };
    });
    setErr((p) => ({ ...p, taluk: "", court: "" }));
  };

  const handleBenchChange = (bnch) => {
    setForm((prev) => {
      const computedCourt = buildTargetCourt({
        courtLevel: prev.courtLevel,
        district: prev.district,
        taluk: prev.taluk,
        bench: bnch,
      });
      const nextCity = bnch.includes("Dharwad") ? "Dharwad" : (bnch.includes("Kalaburagi") ? "Kalaburagi" : "Bengaluru");
      return {
        ...prev,
        bench: bnch,
        court: computedCourt,
        city: nextCity,
      };
    });
    setErr((p) => ({ ...p, court: "" }));
  };

  const togglePracticeArea = (area) => {
    if (!area) return;
    setSpecialities((prev) => {
      const exists = prev.includes(area);
      const next = exists ? prev.filter((x) => x !== area) : [...prev, area];
      setF("speciality", next.join(", "));
      return next;
    });
    setErr((p) => ({ ...p, speciality: "" }));
  };

  const addCustomArea = (area) => {
    const trimmed = (area || "").trim();
    if (!trimmed) return;
    setSpecialities((prev) => {
      if (prev.some((x) => x.toLowerCase() === trimmed.toLowerCase())) return prev;
      const next = [...prev, trimmed];
      setF("speciality", next.join(", "));
      return next;
    });
    setErr((p) => ({ ...p, speciality: "" }));
  };

  const removePracticeArea = (area) => {
    setSpecialities((prev) => {
      const next = prev.filter((x) => x !== area);
      setF("speciality", next.join(", "));
      return next;
    });
  };

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = "Name is required";
    if (!form.email.trim()) e.email = "Email is required";
    else if (!isValidEmail(form.email)) e.email = "Invalid email format";
    if (!form.phone.trim()) e.phone = "Phone is required";
    else if (!isValidPhone(form.phone)) e.phone = "Enter a valid 10-digit phone number";
    if (!isEdit && !form.password) e.password = "Password is required for a new account";
    if (!form.courtLevel) e.courtLevel = "Select level of court";
    if (form.courtLevel !== "Supreme Court" && form.courtLevel !== "High Court" && !form.district) {
      e.district = "Select district";
    }
    if ((form.courtLevel === "Taluk / JMFC / Civil Court" || form.courtLevel === "Revenue Court / Land Tribunal") && !form.taluk) {
      e.taluk = "Select taluk";
    }
    if (!form.city && !form.taluk && !form.district) e.city = "Select a city";
    if (specialities.length === 0 && !form.speciality.trim()) e.speciality = "Select at least one practice area";
    setErr(e);
    return !Object.keys(e).length;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;

    const payload = {
      ...form,
      speciality: specialities.length > 0 ? specialities.join(", ") : form.speciality,
      practiceArea: specialities.length > 0 ? specialities.join(", ") : form.speciality,
      practiceAreas: specialities,
      courtLevel: form.courtLevel,
      district: form.district,
      taluk: form.taluk,
      court: form.court,
      city: form.city || form.taluk || form.district,
    };
    if (isEdit && !payload.password) delete payload.password; // keep existing password if left blank
    onSave(payload);
  };

  return (
    <div className="am-modal-overlay" onClick={onClose}>
      <div className="am-modal" onClick={(e) => e.stopPropagation()}>
        <div className="am-modal-header">
          <h3>{isEdit ? "Edit Advocate" : "Add New Advocate"}</h3>
          <button className="am-modal-close" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit} noValidate className="am-modal-form">
          <div className="am-modal-grid">
            <div className="am-field">
              <label>Full Name *</label>
              <input value={form.name} onChange={(e) => setF("name", e.target.value)} />
              {err.name && <p className="am-err">⚠ {err.name}</p>}
            </div>

            <div className="am-field">
              <label>Phone *</label>
              <input value={form.phone} onChange={(e) => setF("phone", e.target.value)} maxLength={10} />
              {err.phone && <p className="am-err">⚠ {err.phone}</p>}
            </div>
          </div>

          <div className="am-field">
            <label>Email *</label>
            <input type="email" value={form.email} onChange={(e) => setF("email", e.target.value)} />
            {err.email && <p className="am-err">⚠ {err.email}</p>}
          </div>

          <div className="am-field" style={{ marginTop: 2 }}>
            <label style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 4 }}>
              <span style={{ fontWeight: 700, color: "#1e293b", fontSize: 13.5 }}>
                Practice Area &amp; Fields of Expertise *
              </span>
              {specialities.length > 0 && (
                <span style={{ fontSize: 11.5, color: "#166534", background: "#dcfce7", padding: "2px 8px", borderRadius: 12, fontWeight: 700, border: "1px solid #bbf7d0" }}>
                  ✓ {specialities.length} {specialities.length === 1 ? "field selected" : "fields selected"}
                </span>
              )}
            </label>

            {specialities.length > 0 ? (
              <div style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 8,
                margin: "4px 0 10px 0",
                background: "#f8fafc",
                padding: "10px 12px",
                borderRadius: 10,
                border: "1px solid #e2e8f0",
                boxShadow: "inset 0 1px 2px rgba(0,0,0,0.03)"
              }}>
                <div style={{ width: "100%", fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 2 }}>
                  Selected Fields of Expertise (Click ✕ to remove):
                </div>
                {specialities.map((item) => (
                  <span
                    key={item}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      background: "linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%)",
                      color: "#fff",
                      padding: "5px 12px",
                      borderRadius: 16,
                      fontSize: 12.5,
                      fontWeight: 600,
                      boxShadow: "0 2px 4px rgba(30, 58, 138, 0.2)",
                    }}
                  >
                    ⚖️ {item}
                    <button
                      type="button"
                      onClick={() => removePracticeArea(item)}
                      style={{
                        background: "rgba(255,255,255,0.22)",
                        border: "none",
                        color: "#fff",
                        borderRadius: "50%",
                        width: 17,
                        height: 17,
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer",
                        fontSize: 10.5,
                        lineHeight: 1,
                        padding: 0,
                        fontWeight: 700,
                      }}
                      title={`Remove ${item}`}
                    >
                      ✕
                    </button>
                  </span>
                ))}
              </div>
            ) : (
              <div style={{
                padding: "8px 12px",
                background: "#f8fafc",
                border: "1px dashed #cbd5e1",
                borderRadius: 8,
                fontSize: 12,
                color: "#64748b",
                marginBottom: 8,
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}>
                <span>ℹ️</span>
                <span>No practice areas selected yet. Pick from list or type custom field.</span>
              </div>
            )}

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <select
                value=""
                onChange={(e) => { if (e.target.value) togglePracticeArea(e.target.value); }}
                style={{ flex: "1 1 180px" }}
              >
                <option value="">+ Add Practice Area from List…</option>
                {PRACTICE_AREAS.filter(p => !specialities.includes(p)).map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
              <div style={{ display: "flex", gap: 6, flex: "1 1 180px" }}>
                <input
                  placeholder="Or type other expertise (e.g. RERA)"
                  value={customArea}
                  onChange={(e) => setCustomArea(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      if (customArea.trim()) {
                        addCustomArea(customArea);
                        setCustomArea("");
                      }
                    }
                  }}
                  style={{ flex: 1 }}
                />
                <button
                  type="button"
                  className="am-btn-secondary"
                  onClick={() => {
                    if (customArea.trim()) {
                      addCustomArea(customArea);
                      setCustomArea("");
                    }
                  }}
                  style={{ padding: "6px 12px", fontSize: 12, whiteSpace: "nowrap" }}
                >
                  + Add
                </button>
              </div>
            </div>
            {err.speciality && <p className="am-err">⚠ {err.speciality}</p>}
          </div>

          {/* ── 3 Dependent Court & Jurisdiction Sections ──────────────── */}
          <div style={{
            background: "#ffffff",
            border: "1px solid #cbd5e1",
            borderLeft: "5px solid #2563eb",
            borderRadius: 12,
            padding: "16px 18px",
            margin: "12px 0 16px 0",
            boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
          }}>
            <div style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: 6,
              marginBottom: 4,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 18 }}>🏛️</span>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: "#0f172a" }}>
                    Court Hierarchy &amp; Jurisdiction
                  </div>
                  <div style={{ fontSize: 11.5, color: "#64748b" }}>
                    Target court links automatically based on Level, District &amp; Taluk
                  </div>
                </div>
              </div>
              <span style={{ fontSize: 11, background: "#eff6ff", color: "#1d4ed8", padding: "3px 10px", borderRadius: 16, fontWeight: 700, border: "1px solid #bfdbfe" }}>
                3 Dependent Steps
              </span>
            </div>

            <div className="am-modal-grid" style={{ marginTop: 12 }}>
              {/* 1st Section: Level of Court */}
              <div className="am-field">
                <label>Step 1: Level of Court *</label>
                <select
                  value={form.courtLevel}
                  onChange={(e) => handleCourtLevelChange(e.target.value)}
                >
                  <option value="">-- Choose Court Level --</option>
                  {COURT_LEVELS.map((lvl) => (
                    <option key={lvl} value={lvl}>{lvl}</option>
                  ))}
                </select>
                {err.courtLevel && <p className="am-err">⚠ {err.courtLevel}</p>}
              </div>

              {/* Conditional 2nd & 3rd based on Court Level */}
              {form.courtLevel === "High Court" ? (
                <div className="am-field">
                  <label>Step 2: High Court Bench *</label>
                  <select
                    value={form.bench || HIGH_COURT_BENCHES[0]}
                    onChange={(e) => handleBenchChange(e.target.value)}
                  >
                    {HIGH_COURT_BENCHES.map((b) => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                </div>
              ) : form.courtLevel === "Supreme Court" ? (
                <div className="am-field">
                  <label>Step 2: Jurisdiction &amp; Location</label>
                  <input
                    value="Supreme Court of India (New Delhi)"
                    readOnly
                    disabled
                    style={{ background: "#f8fafc", color: "#334155", fontWeight: 600 }}
                  />
                </div>
              ) : (
                <>
                  {/* 2nd Section: District */}
                  <div className="am-field">
                    <label>Step 2: District *</label>
                    <select
                      value={form.district}
                      onChange={(e) => handleDistrictChange(e.target.value)}
                    >
                      <option value="">-- Select District --</option>
                      {getDistricts().map((d) => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                    {err.district && <p className="am-err">⚠ {err.district}</p>}
                  </div>

                  {/* 3rd Section: Taluk (Dependent on District) */}
                  <div className="am-field">
                    <label>
                      Step 3: Taluk {form.courtLevel === "Taluk / JMFC / Civil Court" || form.courtLevel === "Revenue Court / Land Tribunal" ? "*" : ""}
                    </label>
                    <select
                      value={form.taluk}
                      onChange={(e) => handleTalukChange(e.target.value)}
                      disabled={!form.district}
                    >
                      <option value="">
                        {!form.district ? "Select District first" : "-- Select Taluk --"}
                      </option>
                      {getTaluksForDistrict(form.district).map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                    {err.taluk && <p className="am-err">⚠ {err.taluk}</p>}
                  </div>
                </>
              )}
            </div>

            {/* Target Court Output Banner — Only what was selected! */}
            {form.court ? (
              <div style={{
                marginTop: 12,
                background: "linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%)",
                border: "1px solid #86efac",
                borderRadius: 10,
                padding: "10px 14px",
                display: "flex",
                flexDirection: "column",
                gap: 6,
              }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 6 }}>
                  <div style={{ fontSize: 10.5, fontWeight: 800, color: "#166534", textTransform: "uppercase", letterSpacing: "0.6px" }}>
                    🎯 Target Court Jurisdiction (Selected &amp; Linked)
                  </div>
                  <span style={{ fontSize: 11, background: "#dcfce7", color: "#15803d", padding: "2px 8px", borderRadius: 12, fontWeight: 700 }}>
                    ✓ Verified Jurisdiction
                  </span>
                </div>

                <div style={{ fontSize: 14, fontWeight: 800, color: "#0f172a" }}>
                  🏛️ {form.court}
                </div>

                {/* Summary Chips: ONLY what is selected! */}
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 2 }}>
                  {form.courtLevel && (
                    <span style={{ fontSize: 11.5, background: "#ffffff", color: "#1e3a8a", padding: "2px 8px", borderRadius: 14, fontWeight: 600, border: "1px solid #bfdbfe" }}>
                      ⚖️ Level: <strong>{form.courtLevel}</strong>
                    </span>
                  )}
                  {form.district && (
                    <span style={{ fontSize: 11.5, background: "#ffffff", color: "#065f46", padding: "2px 8px", borderRadius: 14, fontWeight: 600, border: "1px solid #a7f3d0" }}>
                      🗺️ District: <strong>{form.district}</strong>
                    </span>
                  )}
                  {form.taluk && (
                    <span style={{ fontSize: 11.5, background: "#ffffff", color: "#7c2d12", padding: "2px 8px", borderRadius: 14, fontWeight: 600, border: "1px solid #fed7aa" }}>
                      📍 Taluk: <strong>{form.taluk}</strong>
                    </span>
                  )}
                  {form.city && (
                    <span style={{ fontSize: 11.5, background: "#ffffff", color: "#475569", padding: "2px 8px", borderRadius: 14, fontWeight: 600, border: "1px solid #cbd5e1" }}>
                      🏙️ Base Location: <strong>{form.city}</strong>
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <div style={{
                marginTop: 10,
                padding: "8px 12px",
                background: "#f8fafc",
                border: "1px dashed #cbd5e1",
                borderRadius: 8,
                fontSize: 12,
                color: "#64748b",
              }}>
                👉 Select Level of Court and District above to compute target court jurisdiction.
              </div>
            )}
            {err.court && <p className="am-err" style={{ marginTop: 6 }}>⚠ {err.court}</p>}
          </div>

          <div className="am-modal-grid">
            <div className="am-field">
              <label>City / Base Location *</label>
              <input
                placeholder="e.g. Gokak, Belagavi"
                value={form.city}
                onChange={(e) => setF("city", e.target.value)}
              />
              {err.city && <p className="am-err">⚠ {err.city}</p>}
            </div>

            <div className="am-field">
              <label>Experience</label>
              <input placeholder="e.g. 10 years" value={form.experience} onChange={(e) => setF("experience", e.target.value)} />
            </div>
          </div>

          <div className="am-modal-grid">
            <div className="am-field">
              <label>Bar ID</label>
              <input value={form.barId} onChange={(e) => setF("barId", e.target.value)} />
            </div>

            <div className="am-field">
              <label>Fee</label>
              <input placeholder="e.g. ₹2,000 / consult" value={form.fee} onChange={(e) => setF("fee", e.target.value)} />
            </div>
          </div>

          <div className="am-field">
            <label>Bio</label>
            <textarea rows={3} value={form.bio} onChange={(e) => setF("bio", e.target.value)} />
          </div>

          <div className="am-modal-grid">
            <div className="am-field">
              <label>{isEdit ? "Reset Password (optional)" : "Password *"}</label>
              <input
                type="text"
                placeholder={isEdit ? "Leave blank to keep current password" : "Set a password"}
                value={form.password}
                onChange={(e) => setF("password", e.target.value)}
              />
              {err.password && <p className="am-err">⚠ {err.password}</p>}
            </div>

            <div className="am-field">
              <label>Status</label>
              <select value={form.status} onChange={(e) => setF("status", e.target.value)}>
                <option value="approved">Approved</option>
                <option value="pending">Pending</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
          </div>

          <div className="am-modal-actions">
            <button type="button" className="am-btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="am-btn-primary">
              {isEdit ? "Save Changes" : "Create Advocate"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Delete confirm modal ───────────────────────────────────
function ConfirmDeleteModal({ label, itemName, onCancel, onConfirm }) {
  return (
    <div className="am-modal-overlay" onClick={onCancel}>
      <div className="am-modal am-modal-sm" onClick={(e) => e.stopPropagation()}>
        <h3>{label}</h3>
        <p>
          This will permanently remove <strong>{itemName}</strong>. This can't be undone.
        </p>
        <div className="am-modal-actions">
          <button className="am-btn-secondary" onClick={onCancel}>Cancel</button>
          <button className="am-btn-delete-confirm" onClick={onConfirm}>Delete Permanently</button>
        </div>
      </div>
    </div>
  );
}

// ── Message row (Messages tab) ─────────────────────────────
function MessageRow({ msg, onOpen, onDelete }) {
  const isContact = msg.type === "contact";
  const title  = isContact ? msg.name : msg.orgName;
  const sub    = isContact ? (msg.subject || "(No subject)") : `${msg.partnershipType} · ${msg.contactName}`;
  const badge  = isContact
    ? { label: "Contact", bg: "#dbeafe", c: "#1e3a5f" }
    : { label: "Partner", bg: "#ede9fe", c: "#5b21b6" };

  return (
    <div className={`am-msg-row ${msg.read ? "" : "unread"}`} onClick={() => onOpen(msg)}>
      {!msg.read && <span className="am-msg-dot" />}
      <div className="am-msg-avatar">{(title || "?").split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}</div>
      <div className="am-msg-body">
        <div className="am-msg-top">
          <span className="am-msg-title">{title}</span>
          <span className="am-msg-type-badge" style={{ background: badge.bg, color: badge.c }}>{badge.label}</span>
        </div>
        <div className="am-msg-sub">{sub}</div>
        <div className="am-msg-snippet">{msg.message}</div>
      </div>
      <div className="am-msg-right">
        <span className="am-msg-date">{formatDateTime(msg.createdAt)}</span>
        <button
          className="am-btn-delete"
          onClick={(e) => { e.stopPropagation(); onDelete(msg); }}
        >
          🗑
        </button>
      </div>
    </div>
  );
}

// ── Message detail modal ───────────────────────────────────
function MessageDetailModal({ msg, onClose }) {
  const isContact = msg.type === "contact";
  return (
    <div className="am-modal-overlay" onClick={onClose}>
      <div className="am-modal" onClick={(e) => e.stopPropagation()}>
        <div className="am-modal-header">
          <h3>{isContact ? "Contact Enquiry" : "Partnership Inquiry"}</h3>
          <button className="am-modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="am-msg-detail">
          {isContact ? (
            <>
              <div className="am-detail-row"><strong>Name:</strong> {msg.name}</div>
              <div className="am-detail-row"><strong>Email:</strong> {msg.email}</div>
              {msg.phone && <div className="am-detail-row"><strong>Phone:</strong> {msg.phone}</div>}
              <div className="am-detail-row"><strong>Subject:</strong> {msg.subject}</div>
            </>
          ) : (
            <>
              <div className="am-detail-row"><strong>Organization:</strong> {msg.orgName}</div>
              <div className="am-detail-row"><strong>Contact Person:</strong> {msg.contactName}</div>
              <div className="am-detail-row"><strong>Email:</strong> {msg.email}</div>
              <div className="am-detail-row"><strong>Partnership Type:</strong> {msg.partnershipType}</div>
            </>
          )}
          <div className="am-detail-row"><strong>Received:</strong> {formatDateTime(msg.createdAt)}</div>

          <div className="am-detail-message">
            <strong>Message:</strong>
            <p>{msg.message}</p>
          </div>
        </div>

        <div className="am-modal-actions">
          <button className="am-btn-secondary" onClick={onClose}>Close</button>
          <a className="am-btn-primary" href={`mailto:${msg.email}`}>✉️ Reply by Email</a>
        </div>
      </div>
    </div>
  );
}

function QuestionRow({ question, onOpen, onDelete }) {
  return (
    <div className={`am-msg-row ${question.read ? "" : "unread"}`} onClick={() => onOpen(question)}>
      {!question.read && <span className="am-msg-dot" />}
      <div className="am-msg-avatar">?</div>
      <div className="am-msg-body">
        <div className="am-msg-top">
          <span className="am-msg-title">{question.name}</span>
          <span className="am-msg-type-badge" style={{ background: "#dcfce7", color: "#166534" }}>{question.category}</span>
        </div>
        <div className="am-msg-sub">{formatDateTime(question.createdAt)}</div>
        <div className="am-msg-snippet">{question.question}</div>
      </div>
      <div className="am-msg-right">
        <button className="am-btn-delete" onClick={(e) => { e.stopPropagation(); onDelete(question); }}>🗑</button>
      </div>
    </div>
  );
}

function QuestionDetailModal({ question, onClose }) {
  return (
    <div className="am-modal-overlay" onClick={onClose}>
      <div className="am-modal" onClick={(e) => e.stopPropagation()}>
        <div className="am-modal-header">
          <h3>Legal Question</h3>
          <button className="am-modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="am-msg-detail">
          <div className="am-detail-row"><strong>Category:</strong> {question.category}</div>
          <div className="am-detail-row"><strong>From:</strong> {question.name}</div>
          {question.phone && <div className="am-detail-row"><strong>Phone:</strong> {question.phone}</div>}
          <div className="am-detail-row"><strong>Received:</strong> {formatDateTime(question.createdAt)}</div>
          <div className="am-detail-message"><strong>Question:</strong><p>{question.question}</p></div>
          <div className="am-detail-message"><strong>Description:</strong><p>{question.description}</p></div>
        </div>
        <div className="am-modal-actions"><button className="am-btn-secondary" onClick={onClose}>Close</button></div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
//  MAIN ADMIN PAGE COMPONENT
// ══════════════════════════════════════════════════════════════
export default function AdminPage() {
  const [authed, setAuthed] = useState(false);
  const [theme, toggleTheme] = useAdminTheme();
  const [railOpen, toggleRail] = useStoredFlag(RAIL_KEY, false);
  const [advocates, setAdvocates] = useState([]);
  const [clients, setClients] = useState(() => getLocalClients());
  const [messages, setMessages] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [tab, setTab] = useState("pending"); // pending | all | messages | questions
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [clientSearch, setClientSearch] = useState("");
  const [clientStatusFilter, setClientStatusFilter] = useState("all");
  const [msgTypeFilter, setMsgTypeFilter] = useState("all"); // all | contact | partner
  const [bookings,    setBookings]    = useState({});
    const [allReqs,     setAllReqs]     = useState({});
    const [bookSearch,   setBookSearch]   = useState("");
    const [bookingModal,  setBookingModal]  = useState(null);
    const [reqModal,      setReqModal]      = useState(null);
    const [toast,         setToast]         = useState(null);

    // ── Toast helper ──────────────────────────────────────────
    const showToast = useCallback((msg, type = "success") => {
      setToast({ msg, type });
      setTimeout(() => setToast(null), 3200);
    }, []);
  
  
  const [editing, setEditing] = useState(null);       // advocate being edited, or null
  const [adding, setAdding] = useState(false);         // add-new modal open?
  const [deleting, setDeleting] = useState(null);      // advocate pending delete confirm
  const [editingClient, setEditingClient] = useState(null);
  const [deletingClient, setDeletingClient] = useState(null);
  const [openMessage, setOpenMessage] = useState(null); // message being viewed
  const [deletingMsg, setDeletingMsg] = useState(null); // message pending delete confirm
  const [openQuestion, setOpenQuestion] = useState(null);
  const [deletingQuestion, setDeletingQuestion] = useState(null);

  // Consultations & Payments state (₹10 PhonePe chat unlocks)
  const [consultations, setConsultations] = useState([]);
  const [consultSearch, setConsultSearch] = useState("");
  const [consultFilter, setConsultFilter] = useState("all");
  const [consultModal, setConsultModal] = useState(null);
  const [selectedClientModal, setSelectedClientModal] = useState(null);
  const [deletingConsult, setDeletingConsult] = useState(null);
  const [addingClient, setAddingClient] = useState(false);

  // Restore a session if the stored token is still valid.
  useEffect(() => {
    const token = getAdminToken();
    if (!token) return;
    if (token.startsWith("offline-") || token === "admin-session") {
      setAuthed(true);
      return;
    }
    api("/api/auth/me", { token })
      .then((me) => setAuthed(me.role === "admin"))
      .catch((err) => {
        if (err.status === 500 || !err.status) {
          setAuthed(true);
        } else {
          setAdminToken(null);
        }
      });
  }, []);

  // Admin sees every status (pending/rejected too), so pull the full list.
  const refreshAdvocates = useCallback(() => {
    loadAdvocates({ all: true })
      .then(setAdvocates)
      .catch(() => setAdvocates(getAdvocates()));
  }, []);
  const refreshClients = useCallback(() => {
    getClients()
      .then((list) => {
        if (Array.isArray(list)) {
          setClients(list);
        } else {
          setClients(getLocalClients());
        }
      })
      .catch(() => {
        setClients(getLocalClients());
      });
  }, []);
  const refreshMessages  = () => setMessages(getMessages());
  const refreshQuestions = () => setQuestions(getQuestions());

  const refreshConsultations = useCallback(() => {
    api("/api/consultations")
      .then((list) => {
        try {
          const local = JSON.parse(localStorage.getItem("law4u_consultation_payments") || "[]");
          const map = new Map();
          (list || []).forEach(item => map.set(item.id || `${item.clientId}_${item.advocateId}`, item));
          local.forEach(item => map.set(item.id || `${item.clientId}_${item.advocateId}`, item));
          setConsultations(Array.from(map.values()));
        } catch {
          setConsultations(list || []);
        }
      })
      .catch(() => {
        try {
          const local = JSON.parse(localStorage.getItem("law4u_consultation_payments") || "[]");
          setConsultations(local);
        } catch {
          setConsultations([]);
        }
      });
  }, []);

  const handleUpdateConsultationStatus = useCallback(async (id, newStatus) => {
    try {
      await api(`/api/consultations/${id}`, {
        method: "PATCH",
        body: { status: newStatus },
        token: getAdminToken()
      });
      showToast(`Consultation marked as ${newStatus}`);
    } catch {
      showToast(`Updated status to ${newStatus}`);
    }
    setConsultations(prev => prev.map(c => c.id === id ? { ...c, status: newStatus } : c));
    try {
      const local = JSON.parse(localStorage.getItem("law4u_consultation_payments") || "[]");
      const updated = local.map(c => c.id === id ? { ...c, status: newStatus } : c);
      localStorage.setItem("law4u_consultation_payments", JSON.stringify(updated));
    } catch {}
  }, [showToast]);

  const handleDeleteConsultation = useCallback(async (id) => {
    try {
      await api(`/api/consultations/${id}`, {
        method: "DELETE",
        token: getAdminToken()
      });
      showToast("Consultation record deleted from database");
    } catch {
      showToast("Consultation record deleted");
    }
    setConsultations(prev => prev.filter(c => c.id !== id));
    try {
      const local = JSON.parse(localStorage.getItem("law4u_consultation_payments") || "[]");
      const updated = local.filter(c => c.id !== id);
      localStorage.setItem("law4u_consultation_payments", JSON.stringify(updated));
    } catch {}
  }, [showToast]);

  useEffect(() => {
    if (authed) {
      refreshAdvocates();
      refreshClients();
      refreshMessages();
      refreshQuestions();
      refreshConsultations();
      setAllReqs(loadRequests());
      setBookings(loadBookings());
    }
  }, [authed, refreshAdvocates, refreshClients, refreshConsultations]);

  // Pick up new submissions if Contact/Partners were filled out in another tab
  useEffect(() => {
    if (!authed) return;
    const onFocus = () => {
      refreshAdvocates();
      refreshClients();
      refreshMessages();
      refreshQuestions();
      refreshConsultations();
      setAllReqs(loadRequests());
      setBookings(loadBookings());
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [authed, refreshAdvocates, refreshClients, refreshConsultations]);
    const allReqList = useMemo(() => Object.values(allReqs).flat(), [allReqs]);
    const dashStats = useMemo(() => {
      const totalReqs = allReqList.length;
      const accReqs   = allReqList.filter(r => r.status === "accepted").length;
      const penReqs   = allReqList.filter(r => r.status === "pending").length;
      const decReqs   = allReqList.filter(r => r.status === "declined").length;
      return { totalReqs, accReqs, penReqs, decReqs };
    }, [allReqList]);

  const paidConsultations = useMemo(() => {
    return consultations.filter(c => (c.status || "").toLowerCase() === "paid");
  }, [consultations]);

  const filteredConsultations = useMemo(() => {
    let list = consultations;
    if (consultFilter === "paid") {
      list = list.filter(c => (c.status || "").toLowerCase() === "paid");
    } else if (consultFilter === "pending") {
      list = list.filter(c => (c.status || "").toLowerCase() !== "paid");
    }
    if (!consultSearch.trim()) return list;
    const q = consultSearch.trim().toLowerCase();
    return list.filter(c =>
      (c.clientName || "").toLowerCase().includes(q) ||
      (c.clientEmail || "").toLowerCase().includes(q) ||
      (c.clientCity || "").toLowerCase().includes(q) ||
      (c.advocateName || "").toLowerCase().includes(q) ||
      (c.advocateSpec || "").toLowerCase().includes(q) ||
      (c.message || "").toLowerCase().includes(q) ||
      (c.status || "").toLowerCase().includes(q)
    );
  }, [consultations, consultFilter, consultSearch]);

  const getClientConsultations = useCallback((cid, cname) => {
    return consultations.filter(c => {
      const matchId = cid && (Number(c.clientId) === Number(cid) || String(c.clientId) === String(cid));
      const matchName = cname && (c.clientName || "").toLowerCase().trim() === String(cname).toLowerCase().trim();
      return matchId || matchName;
    });
  }, [consultations]);

  const handleLogout = () => {
    setAdminToken(null);
    setAuthed(false);
  };
  const pending  = useMemo(() => advocates.filter(a => a.status === "pending"), [advocates]);
  const approved = useMemo(() => advocates.filter(a => a.status === "approved"), [advocates]);
  const unreadMessages = useMemo(() => messages.filter(m => !m.read), [messages]);
  const unreadQuestions = useMemo(() => questions.filter(q => !q.read), [questions]);

  const visibleAll = useMemo(() => {
    let list = advocates;
    if (statusFilter !== "all") list = list.filter(a => a.status === statusFilter);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(a =>
        a.name.toLowerCase().includes(q) ||
        a.email.toLowerCase().includes(q) ||
        (a.city || "").toLowerCase().includes(q) ||
        (a.speciality || "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [advocates, statusFilter, search]);
  

  const visibleMessages = useMemo(() => {
    let list = messages;
    if (msgTypeFilter !== "all") list = list.filter(m => m.type === msgTypeFilter);
    return list;
  }, [messages, msgTypeFilter]);

  const filteredClients = useMemo(() => {
    return clients.filter((c) => {
      if (clientStatusFilter === "approved" && c.status !== "approved") return false;
      if (clientStatusFilter === "pending" && c.status !== "pending") return false;
      if (clientStatusFilter === "with-consultations") {
        const cons = getClientConsultations(c.id, c.name);
        if (cons.length === 0) return false;
      }
      if (!clientSearch.trim()) return true;
      const q = clientSearch.trim().toLowerCase();
      const matchName = (c.name || "").toLowerCase().includes(q);
      const matchEmail = (c.email || "").toLowerCase().includes(q);
      const matchPhone = (c.phone || "").toLowerCase().includes(q);
      const matchCity = (c.city || "").toLowerCase().includes(q);
      const matchId = String(c.id) === q || String(c.id).includes(q);
      return matchName || matchEmail || matchPhone || matchCity || matchId;
    });
  }, [clients, clientStatusFilter, clientSearch, getClientConsultations]);

  const withApi = useCallback(async (action, okMsg) => {
    try {
      await action();
      if (okMsg) showToast(okMsg);
    } catch (error) {
      showToast(error.message || "Request failed", "error");
    } finally {
      refreshAdvocates();
      refreshClients();
    }
  }, [refreshAdvocates, refreshClients, showToast]);

  const handleApproveClient = (id) => withApi(() => api(`/api/clients/${Number(id)}/status`, { method: "POST", body: { status: "approved" }, token: getAdminToken() }), "Client approved");
  const handleRejectClient  = (id) => withApi(() => api(`/api/clients/${Number(id)}/status`, { method: "POST", body: { status: "rejected" }, token: getAdminToken() }), "Client rejected");

  const handleSaveNewClient = (form) =>
    withApi(() => createClient(form), `Client ${form.name} added to clients.json`).then(() => {
      setAddingClient(false);
      refreshClients();
      refreshConsultations();
    });

  const handleEditClient = (client) => setEditingClient(client);
  const handleSaveClient = (form) => {
    const payload = { ...form };
    if (!payload.password) delete payload.password; // don't send empty password
    return withApi(() => updateClient(editingClient.id, payload), "Client updated in clients.json").then(() => {
      setEditingClient(null);
      refreshClients();
      refreshConsultations();
    });
  };

  const handleConfirmDeleteClient = () =>
    withApi(() => deleteClient(deletingClient.id), "Client deleted from clients.json").then(() => {
      setDeletingClient(null);
      refreshClients();
      refreshConsultations();
    });

  const handleApprove = (id) => withApi(() => approveAdvocate(id), "Advocate approved");
  const handleReject  = (id) => withApi(() => rejectAdvocate(id), "Advocate rejected");

  const handleSaveNew = async (form) => {
    await addAdvocate(form);   // throws → AddModal shows the message
    setAdding(false);
    refreshAdvocates();
  };
   // ── Bookings filtered ─────────────────────────────────────
    const filteredBookings = useMemo(() => {
      const list = Object.values(bookings);
      if (!bookSearch.trim()) return list;
      const q = bookSearch.toLowerCase();
      return list.filter(b =>
        (b.clientName||"").toLowerCase().includes(q) ||
        (b.advocateName||"").toLowerCase().includes(q) ||
        (b.clientCity||"").toLowerCase().includes(q) ||
        (b.advocateSpec||"").toLowerCase().includes(q)
      );
    }, [bookings, bookSearch]);

  const handleSaveEdit = (form) =>
    withApi(() => updateAdvocate(editing.id, form), "Advocate updated").then(() => setEditing(null));

  const handleConfirmDelete = () =>
    withApi(() => deleteAdvocate(deleting.id), "Advocate deleted").then(() => setDeleting(null));

  const handleOpenMessage = (msg) => {
    if (!msg.read) {
      markAsRead(msg.id);
      refreshMessages();
    }
    setOpenMessage(msg);
  };

  const handleConfirmDeleteMessage = () => {
    deleteMessage(deletingMsg.id);
    setDeletingMsg(null);
    refreshMessages();
  };

  const handleOpenQuestion = (question) => {
    if (!question.read) {
      markQuestionAsRead(question.id);
      refreshQuestions();
    }
    setOpenQuestion(question);

  };
   // Change request status (from ReqDetailModal or inline)
    const handleReqStatusChange = useCallback((advocateId, req, newStatus) => {
      const reqs     = loadRequests();
      const list     = reqs[advocateId] || [];
      const updated  = list.map(r => {
        const match = (r.id && r.id === req.id) || (r.clientName === req.clientName && r.requestedAt === req.requestedAt);
        if (!match) return r;
        const upd = { ...r, status: newStatus, updatedAt: new Date().toISOString() };
        if (newStatus === "accepted") upd.acceptedAt = new Date().toISOString();
        return upd;
      });
  
      reqs[advocateId] = updated;
      saveRequests(reqs);
      setAllReqs({ ...reqs });
  
      // If accepted → save to bookings AND post to server
      if (newStatus === "accepted") {
        const acceptedReq = updated.find(r => {
          const match = (r.id && r.id === req.id) || (r.clientName === req.clientName);
          return match;
        });
        const adv = advocates.find(a => String(a.id) === String(advocateId));
        if (adv && acceptedReq) {
          persistBooking(acceptedReq, adv);
          setBookings(loadBookings());
          updateAdvocate(adv.id, { lastBookingAt: new Date().toISOString() }).catch(() => {});
          showToast("✅ Booking accepted");
        }
      } else {
        showToast(`Request ${newStatus}`);
      }
    }, [advocates, showToast]);


  const handleConfirmDeleteQuestion = () => {
    deleteQuestion(deletingQuestion.id);
    setDeletingQuestion(null);
    refreshQuestions();
  };
  

  if (!authed) return <AdminLogin onLogin={() => setAuthed(true)} theme={theme} onToggleTheme={toggleTheme} />;

  return (
    <div className={`am-page ${theme === "dark" ? "am-dark" : ""}`}>
      <nav className={`am-rail ${railOpen ? "am-rail-open" : ""}`} aria-label="Admin sections">
        <Link to="/" className="am-rail-logo" aria-label="AdvocatesHub home">
          <img className="am-rail-logo-mark" src={`${process.env.PUBLIC_URL || ""}/brand/logo-mark.svg`} alt="" />
          <span className="am-rail-label">Advocates<b>Hub</b></span>
        </Link>
        <RailButton id="pending"   label="Pending approvals" tab={tab} setTab={setTab} count={pending.length} />
        <RailButton id="all"       label="All advocates"     tab={tab} setTab={setTab} />
        <RailButton id="messages"  label="Messages"          tab={tab} setTab={setTab} count={unreadMessages.length} />
        <RailButton id="clients"   label="Clients"           tab={tab} setTab={setTab} count={clients.length} />
        <RailButton id="consultations" label="Paid consultations" tab={tab} setTab={setTab} count={paidConsultations.length} />
        <RailButton id="questions" label="Questions"         tab={tab} setTab={setTab} count={unreadQuestions.length} />
        <RailButton id="bookings"  label="Client bookings"   tab={tab} setTab={setTab} />
        <RailButton id="requests"  label="All requests"      tab={tab} setTab={setTab} />
        <div className="am-rail-spacer" />
        <button type="button" className="am-rail-btn am-rail-logout" onClick={handleLogout} aria-label="Logout" title="Logout">
          {RAIL_ICONS.logout}
          <span className="am-rail-label">Logout</span>
        </button>
        <button
          type="button"
          className="am-rail-btn am-rail-toggle"
          onClick={toggleRail}
          aria-label={railOpen ? "Collapse sidebar" : "Expand sidebar"}
          aria-expanded={railOpen}
          title={railOpen ? "Collapse" : "Expand"}
        >
          {railOpen ? RAIL_ICONS.collapse : RAIL_ICONS.expand}
          <span className="am-rail-label">Collapse</span>
        </button>
      </nav>

      <div className="am-main">
      <div className="am-topbar">
        <div className="am-topbar-left">
          <Link to="/" className="am-logo">
            <BrandLogo size={30} wordmark={false} />
            <span>Advocates<span style={{ color: "var(--adm-accent)" }}>Hub</span></span>
            <span className="am-logo-tag">Admin console</span>
          </Link>
          <span className="am-live-badge">Live · API connected</span>
        </div>
        <div className="am-topbar-right">
          <ThemeToggle theme={theme} onToggle={toggleTheme} />
          <div className="am-admin-avatar" aria-label="Administrator">AD</div>
          <button className="am-logout-btn" onClick={handleLogout}>
            Logout ↩
          </button>
        </div>
      </div>

      <div className="am-container">

        {/* ── Stats ── */}
        <div className="am-stats-row">
          <StatCard label="Total advocates"  value={advocates.length}      hint="All registered accounts" tone="am-tone-navy" />
          <StatCard label="Pending approval" value={pending.length}        hint="Needs your action" tone="am-tone-warn" />
          <StatCard label="Approved"         value={approved.length}       hint={advocates.length ? `${Math.round((approved.length / advocates.length) * 100)}% of directory` : "—"} tone="am-tone-good" />
          <StatCard label="Total clients"    value={clients.length}        hint="Registered client accounts" tone="am-tone-cyan" />
          <StatCard label="Paid consultations" value={paidConsultations.length} hint="₹10 PhonePe chat unlocks" tone="am-tone-good" />
          <StatCard label="Consultation fees" value={`₹${paidConsultations.length * 10}`} hint="PhonePe 9108717353-3@ybl" tone="am-tone-gold" />
          <StatCard label="Unread messages"  value={unreadMessages.length} hint="Contact & partner forms" tone="am-tone-blue" />
          <StatCard label="New questions"    value={unreadQuestions.length} hint="Awaiting an answer" tone="am-tone-violet" />
        </div>

        {/* ── Paid Consultation Quick Overview Banner ── */}
        <div className="am-consult-overview-banner">
          <div className="am-consult-overview-header">
            <div>
              <div className="am-consult-overview-title">
                <span>💬 Client &amp; Advocate Paid Consultations</span>
                <span className="am-consult-status-badge am-paid">
                  {paidConsultations.length} Paid (₹{paidConsultations.length * 10})
                </span>
              </div>
              <div className="am-consult-overview-sub">
                Clients pay ₹10 app maintenance fee via PhonePe UPI (<b>9108717353-3@ybl</b>) to initiate direct 1-on-1 chat consultations with advocates.
              </div>
            </div>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
              <button 
                type="button" 
                className="am-btn-primary am-btn-sm"
                onClick={() => setTab("consultations")}
              >
                View All Consultations ({consultations.length}) →
              </button>
              <button 
                type="button" 
                className="am-btn-secondary am-btn-sm"
                onClick={() => setTab("clients")}
              >
                View Clients ({clients.length}) →
              </button>
              <button
                type="button"
                className="am-btn-primary am-btn-sm"
                style={{ background: "#059669", borderColor: "#059669" }}
                onClick={() => setAddingClient(true)}
              >
                + Add Client to clients.json
              </button>
            </div>
          </div>

          {/* Quick list of latest consultations */}
          {consultations.length > 0 && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(270px, 1fr))", gap: "10px", marginTop: "14px" }}>
              {consultations.slice(0, 4).map((c) => (
                <div 
                  key={c.id} 
                  style={{ 
                    background: "var(--adm-bg)", 
                    border: "1px solid var(--adm-border)", 
                    borderRadius: "10px", 
                    padding: "10px 14px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "6px",
                    cursor: "pointer",
                    transition: "all 0.2s ease"
                  }}
                  onClick={() => setConsultModal(c)}
                  title="Click to view full receipt and manage status"
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span className={`am-consult-status-badge ${(c.status || c.paymentStatus || "").toLowerCase() === "paid" ? "am-paid" : "am-pending"}`}>
                      {(c.status || c.paymentStatus || "").toLowerCase() === "paid" ? "✅ Paid ₹10" : "⏳ Pending"}
                    </span>
                    <span style={{ fontSize: "11px", color: "var(--adm-muted)" }}>{fmtDate(c.paidAt || c.createdAt)}</span>
                  </div>
                  <div style={{ fontSize: "13px", fontWeight: "600", color: "var(--adm-text)" }}>
                    👤 {c.clientName} <span style={{ color: "var(--adm-muted)", fontWeight: 400 }}>→</span> ⚖️ {c.advocateName}
                  </div>
                  <div style={{ fontSize: "11px", color: "var(--adm-muted)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span>📱 {c.phonePeNumber || "9108717353"}</span>
                    <span style={{ color: "var(--adm-accent)", fontWeight: 600 }}>Receipt →</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Tabs ── */}
        <div className="am-panel">
        <div className="am-tabs">
          <button className={`am-tab ${tab === "pending" ? "active" : ""}`} onClick={() => setTab("pending")}>
            Pending Approvals {pending.length > 0 && <span className="am-tab-badge">{pending.length}</span>}
          </button>
          <button className={`am-tab ${tab === "all" ? "active" : ""}`} onClick={() => setTab("all")}>
            All Advocates
          </button>
          <button className={`am-tab ${tab === "messages" ? "active" : ""}`} onClick={() => setTab("messages")}>
            Messages {unreadMessages.length > 0 && <span className="am-tab-badge">{unreadMessages.length}</span>}
          </button>
          <button className={`am-tab ${tab === "clients" ? "active" : ""}`} onClick={() => setTab("clients")}>
            Clients {clients.length > 0 && <span className="am-tab-badge">{clients.length}</span>}
          </button>
          <button className={`am-tab ${tab === "consultations" ? "active" : ""}`} onClick={() => setTab("consultations")}>
            Paid Consultations {paidConsultations.length > 0 && <span className="am-tab-badge">{paidConsultations.length}</span>}
          </button>
          <button className={`am-tab ${tab === "questions" ? "active" : ""}`} onClick={() => setTab("questions")}>
            Questions {unreadQuestions.length > 0 && <span className="am-tab-badge">{unreadQuestions.length}</span>}
          </button>
          <button className={`am-tab ${tab === "bookings" ? "active" : ""}`} onClick={() => setTab("bookings")}>
          Client Bookings {Object.keys(bookings).length > 0 && <span className="am-tab-badge">{Object.keys(bookings).length}</span>}
         </button>
         <button className={`am-tab ${tab === "requests" ? "active" : ""}`} onClick={() => setTab("requests")}>
           All Requests {dashStats.totalReqs > 0 && <span className="am-tab-badge">{dashStats.totalReqs}</span>}
        </button>
          
        </div>

        {/* ── Pending Approvals tab ── */}
        {tab === "pending" && (
          <div className="am-section">
            {pending.length === 0 ? (
              <div className="am-empty">🎉 No pending applications right now.</div>
            ) : (
              <div className="am-pending-grid">
                {pending.map((adv) => (
                  <PendingCard
                    key={adv.id}
                    adv={adv}
                    onApprove={handleApprove}
                    onReject={handleReject}
                    onEdit={setEditing}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── All Advocates tab ── */}
        {tab === "all" && (
          <div className="am-section">
            <div className="am-toolbar">
              <input
                className="am-search"
                placeholder="Search by name, email, city, speciality…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <select className="am-status-filter" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="all">All Statuses</option>
                <option value="approved">Approved</option>
                <option value="pending">Pending</option>
                <option value="rejected">Rejected</option>
              </select>
              <button className="am-btn-primary" onClick={() => setAdding(true)}>+ Add Advocate</button>
            </div>

            {visibleAll.length === 0 ? (
              <div className="am-empty">No advocates match your search.</div>
            ) : (
              <div className="am-list">
                {visibleAll.map((adv) => (
                  <AdvocateRow key={adv.id} adv={adv} onEdit={setEditing} onDelete={setDeleting} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Messages tab ── */}
        {tab === "messages" && (
          <div className="am-section">
            <div className="am-toolbar">
              <div className="am-msg-filter-tabs">
                {["all", "contact", "partner"].map((f) => (
                  <button
                    key={f}
                    className={`am-msg-filter-tab ${msgTypeFilter === f ? "active" : ""}`}
                    onClick={() => setMsgTypeFilter(f)}
                  >
                    {f === "all" ? "All" : f === "contact" ? "Contact" : "Partners"}
                  </button>
                ))}
              </div>
            </div>

            {visibleMessages.length === 0 ? (
              <div className="am-empty">📭 No messages yet. Submissions from the Contact and Partners pages will show up here.</div>
            ) : (
              <div className="am-msg-list">
                {visibleMessages.map((msg) => (
                  <MessageRow
                    key={msg.id}
                    msg={msg}
                    onOpen={handleOpenMessage}
                    onDelete={setDeletingMsg}
                  />
                ))}
              </div>
            )}
          </div>
        )}
        {tab === "clients" && (
          <div className="am-section">
            {/* Header info */}
            <div className="am-bk-header" style={{ marginBottom: 16 }}>
              <div>
                <h2 className="am-bk-title" style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                  Client Directory &amp; Accounts
                  <span className="am-count-pill">{clients.length} Registered in clients.json</span>
                </h2>
                <div style={{ fontSize: 13, color: "var(--adm-muted)", marginTop: 4 }}>
                  All client account profiles stored in <b style={{ fontFamily: "monospace" }}>backend/data/clients.json</b> with linked ₹10 PhonePe (<b>9108717353-3@ybl</b>) advocate consultations.
                </div>
              </div>

              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                <div className="am-msg-filter-tabs">
                  {[
                    { id: "all", label: `All (${clients.length})` },
                    { id: "approved", label: `Approved (${clients.filter(c => c.status === "approved").length})` },
                    { id: "pending", label: `Pending (${clients.filter(c => c.status === "pending").length})` },
                    { id: "with-consultations", label: `With Consultations (${clients.filter(c => getClientConsultations(c.id, c.name).length > 0).length})` }
                  ].map((f) => (
                    <button
                      key={f.id}
                      className={`am-msg-filter-tab ${clientStatusFilter === f.id ? "active" : ""}`}
                      onClick={() => setClientStatusFilter(f.id)}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
                <input
                  className="am-search am-bk-search"
                  placeholder="Search client by name, email, phone, city, or ID…"
                  value={clientSearch}
                  onChange={(e) => setClientSearch(e.target.value)}
                />
                <button 
                  type="button" 
                  className="am-btn-primary" 
                  onClick={() => setAddingClient(true)}
                  style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, padding: "8px 14px", whiteSpace: "nowrap" }}
                >
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                  + Add Client to clients.json
                </button>
              </div>
            </div>

            {/* Mini stats */}
            <div className="am-mini-stats">
              <StatCard label="Total Clients" value={clients.length} tone="am-tone-navy" hint="backend/data/clients.json" />
              <StatCard label="Approved Accounts" value={clients.filter(c => c.status === "approved").length} tone="am-tone-good" />
              <StatCard label="Pending Approval" value={clients.filter(c => c.status === "pending").length} tone="am-tone-warn" />
              <StatCard label="Consultation Chits" value={paidConsultations.length} tone="am-tone-gold" hint="PhonePe 9108717353-3@ybl" />
            </div>

            {filteredClients.length === 0 ? (
              <div className="am-empty am-empty-rich">
                <div className="am-empty-icon">👥</div>
                <div className="am-empty-title">
                  {clientSearch ? `No clients matching "${clientSearch}"` : "No clients found for this filter"}
                </div>
                <div>All accounts in <b style={{ fontFamily: "monospace" }}>backend/data/clients.json</b> are synchronized automatically.</div>
                <button 
                  type="button" 
                  className="am-btn-primary" 
                  onClick={() => setAddingClient(true)}
                  style={{ marginTop: 12 }}
                >
                  + Add First Client
                </button>
              </div>
            ) : (
              <div className="am-list">
                {filteredClients.map((c) => {
                  const clientCons = getClientConsultations(c.id, c.name);
                  const paidConsCount = clientCons.filter(x => (x.status || x.paymentStatus || "").toLowerCase() === "paid").length;
                  return (
                    <div key={c.id} className="am-row" style={{ flexDirection: "column", gap: 14, alignItems: "stretch", position: "relative", padding: "18px 20px" }}>
                      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 14 }}>
                        <div 
                          style={{ display: "flex", alignItems: "flex-start", gap: 14, cursor: "pointer" }}
                          onClick={() => setSelectedClientModal(c)}
                          title="Click to view full client profile and consultation details"
                        >
                          <Avi name={c.name} size={50} />
                          <div>
                            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                              <span className="am-row-name" style={{ fontSize: 17, fontWeight: 700 }}>{c.name}</span>
                              <span style={{ fontSize: 11, background: "var(--adm-hover)", color: "var(--adm-muted)", padding: "2px 8px", borderRadius: 12, fontWeight: 600 }}>
                                ID #{c.id}
                              </span>
                              <SBadge status={c.status || "approved"} />
                            </div>
                            <div style={{ display: "flex", gap: 14, marginTop: 4, flexWrap: "wrap", fontSize: 13, color: "var(--adm-text)" }}>
                              <span>📧 <b>{c.email}</b></span>
                              {c.phone && <span>📞 <b>{c.phone}</b></span>}
                              <span>📍 <b>{c.city || "Gokak, Karnataka"}</b></span>
                            </div>
                            <div style={{ fontSize: 11.5, color: "var(--adm-muted)", marginTop: 4 }}>
                              🗓️ Registered: <b>{fmtDate(c.createdAt)}</b>
                            </div>
                          </div>
                        </div>

                        <div style={{ textAlign: "right", display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-end" }}>
                          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                            {paidConsCount > 0 ? (
                              <span className="am-consult-status-badge am-paid" style={{ fontSize: 12, padding: "4px 10px" }}>
                                ✅ {paidConsCount} Paid Chat{paidConsCount > 1 ? "s" : ""} (₹{paidConsCount * 10})
                              </span>
                            ) : (
                              <span className="am-consult-status-badge" style={{ background: "var(--adm-hover)", color: "var(--adm-muted)", fontSize: 12, padding: "4px 10px" }}>
                                ⏳ No Paid Chats Yet
                              </span>
                            )}
                          </div>
                          <div style={{ display: "flex", gap: 8, marginTop: 2, flexWrap: "wrap" }}>
                            <button 
                              type="button" 
                              className="am-btn-primary am-btn-sm" 
                              onClick={() => setSelectedClientModal(c)}
                              style={{ fontWeight: 600 }}
                            >
                              👁️ View Details
                            </button>
                            {c.status === "pending" && (
                              <>
                                <button className="am-btn-approve am-btn-sm" onClick={() => handleApproveClient(c.id)}>✓ Approve</button>
                                <button className="am-btn-reject am-btn-sm" onClick={() => handleRejectClient(c.id)}>✕ Reject</button>
                              </>
                            )}
                            <button className="am-btn-secondary am-btn-sm" onClick={() => handleEditClient(c)}>
                              ✏️ Edit Client
                            </button>
                            <button className="am-btn-danger am-btn-sm" onClick={() => setDeletingClient(c)}>
                              🗑️ Delete
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Advocate Consultation Breakdown for this client */}
                      <div style={{ borderTop: "1px dashed var(--adm-border)", paddingTop: 12, marginTop: 4 }}>
                        <div style={{ fontSize: 12.5, fontWeight: 700, color: "var(--adm-muted)", marginBottom: 10, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 6 }}>
                          <span>⚖️ Selected Advocate &amp; ₹10 PhonePe Consultations ({clientCons.length})</span>
                          <span style={{ fontSize: 11.5, fontWeight: 600, color: "var(--adm-good)" }}>PhonePe UPI ID: <b>9108717353-3@ybl</b></span>
                        </div>

                        {clientCons.length === 0 ? (
                          <div style={{ fontSize: 12.5, color: "var(--adm-muted)", background: "var(--adm-bg)", padding: "12px 16px", borderRadius: 8, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                            <span>ℹ️ This client has not unlocked an advocate consultation chat yet.</span>
                            <button 
                              type="button"
                              className="am-btn-secondary am-btn-sm" 
                              onClick={() => handleEditClient(c)}
                              style={{ fontSize: 11.5, padding: "4px 10px" }}
                            >
                              + Assign Advocate Consultation
                            </button>
                          </div>
                        ) : (
                          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 12 }}>
                            {clientCons.map((con) => {
                              const isPaid = (con.status || con.paymentStatus || "").toLowerCase() === "paid";
                              return (
                                <div 
                                  key={con.id} 
                                  style={{ 
                                    background: "var(--adm-bg)", 
                                    border: "1px solid var(--adm-border)", 
                                    borderRadius: 10, 
                                    padding: "12px 14px",
                                    display: "flex",
                                    flexDirection: "column",
                                    gap: 8
                                  }}
                                >
                                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 6 }}>
                                    <span style={{ fontWeight: 700, fontSize: 14, color: "var(--adm-text)" }}>
                                      ⚖️ Adv. {con.advocateName}
                                    </span>
                                    <span className={`am-consult-status-badge ${isPaid ? "am-paid" : "am-pending"}`} style={{ fontSize: 11, padding: "3px 8px" }}>
                                      {isPaid ? `✅ Paid ₹${con.amount || 10}` : "⏳ Pending"}
                                    </span>
                                  </div>
                                  <div style={{ fontSize: 12, color: "var(--adm-muted)" }}>
                                    {con.advocateSpec || "Advocate & Legal Consultant"} · {con.advocateCity || "Karnataka"}
                                  </div>
                                  {con.message && (
                                    <div style={{ fontSize: 12, color: "var(--adm-text)", background: "rgba(0,0,0,0.03)", borderLeft: "3px solid var(--adm-accent)", padding: "6px 10px", borderRadius: 4 }}>
                                      💬 <b>Inquiry:</b> &ldquo;{con.message}&rdquo;
                                    </div>
                                  )}
                                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 11.5, color: "var(--adm-muted)", marginTop: 2, flexWrap: "wrap", gap: 6 }}>
                                    <span>📱 PhonePe: <b>{con.phonePeNumber || "9108717353"}</b></span>
                                    <span>UPI: <b>{con.upiId || "9108717353-3@ybl"}</b></span>
                                    <button 
                                      type="button" 
                                      className="am-link-btn" 
                                      style={{ fontSize: 11.5, color: "var(--adm-accent)", fontWeight: 700, cursor: "pointer" }}
                                      onClick={() => setConsultModal(con)}
                                    >
                                      Receipt →
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ═══════════════════════════════════════════════
            PAID CONSULTATIONS TAB — Client to Advocate ₹10 chats
            ═══════════════════════════════════════════════ */}
        {tab === "consultations" && (
          <div className="am-section am-bk">
            <div className="am-bk-head">
              <div>
                <h2 className="am-bk-title" style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  Client &amp; Advocate Paid Consultations
                  <span className="am-count-pill">{consultations.length} total</span>
                </h2>
                <div style={{ fontSize: 13, color: "var(--adm-muted)", marginTop: 4 }}>
                  ₹10 app maintenance fee paid via PhonePe (<b>9108717353-3@ybl</b>) for 1-on-1 advocate chat unlocks.
                </div>
              </div>

              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                <div className="am-msg-filter-tabs">
                  {["all", "paid", "pending"].map((f) => (
                    <button
                      key={f}
                      className={`am-msg-filter-tab ${consultFilter === f ? "active" : ""}`}
                      onClick={() => setConsultFilter(f)}
                    >
                      {f === "all" ? `All (${consultations.length})` : f === "paid" ? `Paid (${paidConsultations.length})` : `Pending (${consultations.filter(x => x.paymentStatus !== "Paid").length})`}
                    </button>
                  ))}
                </div>
                <input 
                  className="am-search am-bk-search" 
                  placeholder="Search client, advocate, or PhonePe ref…" 
                  value={consultSearch}
                  onChange={(e) => setConsultSearch(e.target.value)} 
                />
                <button
                  type="button"
                  className="am-btn-primary"
                  onClick={() => setAddingClient(true)}
                  style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, padding: "8px 14px", whiteSpace: "nowrap" }}
                >
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                  Add Client to clients.json
                </button>
              </div>
            </div>

            {/* Summary mini stats */}
            <div className="am-mini-stats">
              <StatCard label="Total consultations" value={consultations.length} tone="am-tone-navy" />
              <StatCard label="Paid chat unlocks"   value={paidConsultations.length} tone="am-tone-good" />
              <StatCard label="Total fees collected" value={`₹${paidConsultations.length * 10}`} tone="am-tone-gold" hint="PhonePe 9108717353-3@ybl" />
              <StatCard label="Pending verification" value={consultations.filter(c => c.paymentStatus !== "Paid").length} tone="am-tone-warn" />
            </div>

            {filteredConsultations.length === 0 ? (
              <div className="am-empty am-empty-rich">
                <div className="am-empty-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="2" y="4" width="20" height="16" rx="2" /><line x1="2" y1="10" x2="22" y2="10" /></svg>
                </div>
                <div className="am-empty-title">{consultSearch ? `No consultations matching "${consultSearch}"` : "No consultations recorded yet"}</div>
                <div>When a client pays ₹10 via PhonePe to consult with an advocate, the complete payment and chat unlock record appears here.</div>
              </div>
            ) : (
              <div className="am-list">
                {filteredConsultations.map((con) => {
                  const clientObj = clients.find(c => 
                    (c.id && con.clientId && Number(c.id) === Number(con.clientId)) ||
                    (c.name && con.clientName && c.name.toLowerCase().trim() === con.clientName.toLowerCase().trim())
                  );
                  const clientData = clientObj || { 
                    id: con.clientId, 
                    name: con.clientName, 
                    email: con.clientEmail, 
                    phone: con.clientPhone, 
                    city: con.clientCity, 
                    status: "approved" 
                  };
                  const isPaid = (con.status || con.paymentStatus || "").toLowerCase() === "paid";

                  return (
                    <div key={con.id} className="am-row am-consult-row" style={{ flexDirection: "column", gap: 12, alignItems: "stretch" }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 14 }}>
                        {/* Client side (connected with clients.json) */}
                        <div 
                          className="am-bk-party" 
                          style={{ cursor: "pointer" }}
                          onClick={() => setSelectedClientModal(clientData)}
                          title="Click to view full client profile from clients.json"
                        >
                          <Avi name={clientData.name} size={46} />
                          <div className="am-bk-party-text">
                            <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                              <span className="am-row-name" style={{ fontSize: 15 }}>{clientData.name}</span>
                              <span style={{ fontSize: 10, background: "var(--adm-hover)", color: "var(--adm-accent)", padding: "1px 6px", borderRadius: 8, fontWeight: 700 }}>
                                clients.json #{clientData.id}
                              </span>
                              <SBadge status={clientData.status || "approved"} />
                            </div>
                            <div className="am-row-sub">{clientData.email || "No email"}</div>
                            {clientData.phone && <div className="am-row-contact">📞 {clientData.phone}</div>}
                            <div style={{ fontSize: 11, color: "var(--adm-muted)", marginTop: 2 }}>
                              📍 {clientData.city || "Gokak, Karnataka"}
                            </div>
                          </div>
                        </div>

                        <div className="am-bk-arrow" aria-hidden="true" title="Consulting with">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
                        </div>

                        {/* Advocate side */}
                        <div className="am-bk-party am-bk-party-grow">
                          <Avi name={con.advocateName} color={colorFor(con.advocateId)} size={44} />
                          <div className="am-bk-party-text">
                            <div className="am-row-name">Adv. {con.advocateName}</div>
                            <div className="am-row-sub">{con.advocateSpec || "Advocate & Legal Consultant"}</div>
                            <div className="am-row-contact">📍 {con.advocateCity || "Karnataka"}</div>
                          </div>
                        </div>

                        {/* Payment details & status */}
                        <div className="am-consult-pay-info" style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 170 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <span className={`am-consult-status-badge ${isPaid ? "am-paid" : "am-pending"}`}>
                              {isPaid ? `✅ Paid ₹${con.amount || 10}` : "⏳ Pending"}
                            </span>
                          </div>
                          <div style={{ fontSize: 12, fontWeight: 600, color: "var(--adm-text)" }}>
                            📱 PhonePe: {con.phonePeNumber || "9108717353"}
                          </div>
                          <div style={{ fontSize: 11, color: "var(--adm-muted)" }}>
                            UPI: <b>{con.upiId || "9108717353-3@ybl"}</b>
                          </div>
                          <div style={{ fontSize: 11, color: "var(--adm-muted)" }}>
                            Txn: {con.transactionId || con.id}
                          </div>
                          <div style={{ fontSize: 11, color: "var(--adm-muted)" }}>
                            🕒 {fmtDate(con.paidAt || con.createdAt)}
                          </div>
                        </div>
                      </div>

                      {/* Inquiry snippet if present */}
                      {con.message && (
                        <div style={{ background: "var(--adm-bg)", border: "1px dashed var(--adm-border)", padding: "8px 12px", borderRadius: 8, fontSize: 12, color: "var(--adm-text)" }}>
                          💬 <b>Case Inquiry:</b> &ldquo;{con.message}&rdquo;
                        </div>
                      )}

                      {/* Action buttons connecting to clients.json and payments.json */}
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px dashed var(--adm-border)", paddingTop: 8, flexWrap: "wrap", gap: 8 }}>
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                          <button 
                            type="button" 
                            className="am-btn-primary am-btn-sm" 
                            onClick={() => setSelectedClientModal(clientData)}
                            title="View full client profile and case details"
                          >
                            👁️ View Client Details
                          </button>
                          <button 
                            type="button" 
                            className="am-btn-secondary am-btn-sm" 
                            onClick={() => setConsultModal(con)}
                            title="View PhonePe payment receipt"
                          >
                            🧾 Receipt
                          </button>
                          <button 
                            type="button" 
                            className="am-btn-secondary am-btn-sm" 
                            onClick={() => handleEditClient(clientData)}
                            title="Edit client details in clients.json"
                          >
                            ✏️ Edit Client (clients.json)
                          </button>
                          <button 
                            type="button" 
                            className="am-btn-danger am-btn-sm" 
                            onClick={() => setDeletingClient(clientData)}
                            title="Delete this client from clients.json and payments"
                          >
                            🗑️ Delete Client
                          </button>
                        </div>

                        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                          <button 
                            type="button"
                            className={isPaid ? "am-btn-secondary" : "am-btn-approve"}
                            style={{ fontSize: 11, padding: "4px 10px" }}
                            onClick={() => handleUpdateConsultationStatus(con.id, isPaid ? "Pending" : "Paid")}
                          >
                            {isPaid ? "Mark Pending" : "✓ Mark Paid"}
                          </button>
                          <button 
                            type="button"
                            className="am-btn-danger"
                            style={{ fontSize: 11, padding: "4px 8px" }}
                            onClick={() => setDeletingConsult(con)}
                            title="Delete this consultation payment record"
                          >
                            ✕ Delete Record
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
        
          {/* ═══════════════════════════════════════════════
              BOOKINGS TAB — who booked whom
              ═══════════════════════════════════════════════ */}
          {tab === "bookings" && (
            <div className="am-section am-bk">
              <div className="am-bk-head">
                <h2 className="am-bk-title">
                  Client bookings
                  <span className="am-count-pill">{Object.keys(bookings).length} total</span>
                </h2>
                <input className="am-search am-bk-search" placeholder="Search client or advocate…" value={bookSearch}
                  onChange={e=>setBookSearch(e.target.value)} />
              </div>

              {/* Summary stats */}
              <div className="am-mini-stats">
                <StatCard label="Total bookings"    value={Object.keys(bookings).length} tone="am-tone-navy" />
                <StatCard label="Accepted"          value={Object.values(bookings).filter(b=>b.status==="accepted").length} tone="am-tone-good" />
                <StatCard label="Cases in progress" value={Object.values(bookings).filter(b=>b.caseStage==="Case Progress").length} tone="am-tone-warn" />
                <StatCard label="Cases closed"      value={Object.values(bookings).filter(b=>b.caseStage==="Close Case").length} tone="am-tone-blue" />
              </div>

              {filteredBookings.length === 0 ? (
                <div className="am-empty am-empty-rich">
                  <div className="am-empty-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></svg>
                  </div>
                  <div className="am-empty-title">{bookSearch ? `No bookings matching "${bookSearch}"` : "No bookings yet"}</div>
                  <div>When a client&rsquo;s request is accepted, the booking appears here.</div>
                </div>
              ) : (
                <div className="am-list">
                  {filteredBookings.map((b,i) => (
                    <div key={i} className="am-row am-bk-row">
                      {/* Client side */}
                      <div className="am-bk-party">
                        <Avi name={b.clientName} size={42} />
                        <div className="am-bk-party-text">
                          <div className="am-row-name">{b.clientName}</div>
                          <div className="am-row-sub">Client</div>
                          {b.clientPhone && <div className="am-row-contact">{b.clientPhone}</div>}
                        </div>
                      </div>

                      <div className="am-bk-arrow" aria-hidden="true">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
                      </div>

                      {/* Advocate side */}
                      <div className="am-bk-party am-bk-party-grow">
                        <Avi name={b.advocateName} color={colorFor(b.advocateId)} size={42} />
                        <div className="am-bk-party-text">
                          <div className="am-row-name">{b.advocateName}</div>
                          <div className="am-row-sub">Advocate</div>
                          {b.advocateSpec && <div className="am-row-contact">{b.advocateSpec}</div>}
                        </div>
                      </div>

                      {/* Status & stage */}
                      <div className="am-bk-status">
                        <SBadge status={b.status} />
                        <span className="am-stage-pill">{b.caseStage||"Start Case"}</span>
                        <span className="am-msg-date">{fmtDate(b.acceptedAt)}</span>
                      </div>

                      <button className="am-btn-edit" onClick={()=>setBookingModal(b)}>View details</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ═══════════════════════════════════════════════
              ALL REQUESTS TAB
              ═══════════════════════════════════════════════ */}
          {tab === "requests" && (
            <div className="am-section am-bk">
              <div className="am-bk-head">
                <h2 className="am-bk-title">All client requests</h2>
              </div>

              {/* Global stats */}
              <div className="am-mini-stats">
                <StatCard label="Total requests" value={dashStats.totalReqs} tone="am-tone-navy" />
                <StatCard label="Accepted"       value={dashStats.accReqs} tone="am-tone-good" />
                <StatCard label="Pending"        value={dashStats.penReqs} tone="am-tone-warn" />
                <StatCard label="Declined"       value={dashStats.decReqs} tone="am-tone-bad" />
              </div>

              {/* Per-advocate sections */}
              {advocates.map(adv => {
                const list = allReqs[adv.id] || [];
                if (list.length === 0) return null;
                const stats = getReqStats(adv.id, allReqs);
                return (
                  <div key={adv.id} className="am-req-card">
                    {/* Header */}
                    <div className="am-req-head">
                      <Avi name={adv.name} color={colorFor(adv.id)} size={40} src={adv.avatar||adv.image} />
                      <div className="am-req-head-text">
                        <div className="am-row-name">{adv.name}</div>
                        <div className="am-row-sub">{adv.speciality||adv.practiceArea} · {adv.city||adv.location}</div>
                        <ReqStatsBar stats={stats} />
                      </div>
                      <button className="am-btn-primary am-btn-sm" onClick={()=>setReqModal(adv)}>Manage requests →</button>
                    </div>

                    {/* Request list */}
                    <div className="am-req-list">
                      {list.slice(0,3).map((req,i)=>(
                        <div key={i} className="am-req-item">
                          <Avi name={req.clientName} size={30} />
                          <div className="am-req-item-text">
                            <div className="am-req-item-name">{req.clientName}</div>
                            <div className="am-msg-date">{fmtDate(req.requestedAt)}</div>
                            {req.message && <div className="am-req-item-msg">{req.message.slice(0,60)}{req.message.length>60?"…":""}</div>}
                          </div>
                          <SBadge status={req.status} />
                          {req.status === "pending" && (
                            <div className="am-row-actions">
                              <button className="am-btn-approve" onClick={()=>handleReqStatusChange(adv.id,req,"accepted")}>✓ Accept</button>
                              <button className="am-btn-reject" onClick={()=>handleReqStatusChange(adv.id,req,"declined")}>✕ Decline</button>
                            </div>
                          )}
                        </div>
                      ))}
                      {list.length > 3 && (
                        <button className="am-link-btn" onClick={()=>setReqModal(adv)}>
                          + {list.length-3} more requests — View all →
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}

              {dashStats.totalReqs === 0 && (
                <div className="am-empty am-empty-rich">
                  <div className="am-empty-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h10" /></svg>
                  </div>
                  <div className="am-empty-title">No requests yet</div>
                  <div>Consultation requests sent from advocate profiles will appear here.</div>
                </div>
              )}
            </div>
          )}

        {tab === "questions" && (
          <div className="am-section">
            {questions.length === 0 ? (
              <div className="am-empty">❓ No legal questions submitted yet.</div>
            ) : (
              <div className="am-msg-list">
                {questions.map((question) => (
                  <QuestionRow key={question.id} question={question} onOpen={handleOpenQuestion} onDelete={setDeletingQuestion} />
                ))}
              </div>
            )}
          </div>
        )}

        </div>{/* /am-panel */}
      </div>{/* /am-container */}
      </div>{/* /am-main */}

      {adding && (
        <AdvocateFormModal
          initial={null}
          onClose={() => setAdding(false)}
          onSave={handleSaveNew}
        />
      )}

      {editing && (
        <AdvocateFormModal
          initial={editing}
          onClose={() => setEditing(null)}
          onSave={handleSaveEdit}
        />
      )}

      {deleting && (
        <ConfirmDeleteModal
          label="Delete this advocate?"
          itemName={`${deleting.name}'s account`}
          onCancel={() => setDeleting(null)}
          onConfirm={handleConfirmDelete}
        />
      )}

      {openMessage && (
        <MessageDetailModal
          msg={openMessage}
          onClose={() => setOpenMessage(null)}
        />
      )}

      {deletingMsg && (
        <ConfirmDeleteModal
          label="Delete this message?"
          itemName="this message"
          onCancel={() => setDeletingMsg(null)}
          onConfirm={handleConfirmDeleteMessage}
        />
      )}

      {openQuestion && <QuestionDetailModal question={openQuestion} onClose={() => setOpenQuestion(null)} />}

      {deletingQuestion && (
        <ConfirmDeleteModal
          label="Delete this question?"
          itemName="this legal question"
          onCancel={() => setDeletingQuestion(null)}
          onConfirm={handleConfirmDeleteQuestion}
        />
      )}
      {editingClient && (
        <ClientEditModal
          client={editingClient}
          onClose={() => setEditingClient(null)}
          onSave={handleSaveClient}
        />
      )}

      {deletingClient && (
        <ConfirmDeleteModal
          label="Delete this client?"
          itemName={`${deletingClient.name}'s account`}
          onCancel={() => setDeletingClient(null)}
          onConfirm={handleConfirmDeleteClient}
        />
      )}
      {reqModal && (
        <ReqDetailModal
          adv={reqModal} allReqs={allReqs}
          onClose={() => setReqModal(null)}
          onStatusChange={handleReqStatusChange}
        />
      )}
      {bookingModal && (
        <BookingModal booking={bookingModal} onClose={() => setBookingModal(null)} />
      )}
      {consultModal && (
        <ConsultationModal
          consultation={consultModal}
          onClose={() => setConsultModal(null)}
          onUpdateStatus={handleUpdateConsultationStatus}
        />
      )}
      {selectedClientModal && (
        <ClientDetailModal
          client={selectedClientModal}
          consultations={consultations}
          bookings={bookings}
          onClose={() => setSelectedClientModal(null)}
          onEdit={handleEditClient}
          onApprove={handleApproveClient}
          onReject={handleRejectClient}
          onDelete={setDeletingClient}
          onUpdateConsultStatus={handleUpdateConsultationStatus}
        />
      )}
      {addingClient && (
        <ClientAddModal
          advocates={advocates}
          onClose={() => setAddingClient(false)}
          onSave={handleSaveNewClient}
        />
      )}
      {deletingConsult && (
        <ConfirmDeleteModal
          label="Delete this consultation record?"
          itemName={`consultation for ${deletingConsult.clientName} with Adv. ${deletingConsult.advocateName}`}
          onCancel={() => setDeletingConsult(null)}
          onConfirm={() => {
            handleDeleteConsultation(deletingConsult.id);
            setDeletingConsult(null);
          }}
        />
      )}
      {toast && (
        <div className={`am-toast am-toast-${toast.type || "success"}`}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}