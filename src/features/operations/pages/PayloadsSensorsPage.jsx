import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Camera,
  Layers,
  Calendar,
  Video,
  Check,
  CheckCircle2,
  AlertTriangle,
  Flame,
  Radio,
  Sliders,
  Compass,
  Zap,
  BarChart3,
  Shield,
  Clock,
  Eye,
  Crosshair,
  Volume2,
  Package,
} from "lucide-react";
import { getPayloadImage } from "@/assets/payloads/index.js";

/**
 * PayloadsSensorsPage
 * Dedicated enterprise sensor inventory and compatibility studio.
 * Features 8 inventory cards, calibration due alerts, weekly usage frequencies,
 * and the authoritative "What fits what" drone-to-payload compatibility matrix.
 * Faithfully matches media_1791545065415.png reference.
 */
const PayloadsSensorsPage = () => {
  const navigate = useNavigate();

  const [selectedPayloadId, setSelectedPayloadId] = useState("rgb");
  const [toastMsg, setToastMsg] = useState(null);

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  // 8 Payloads Inventory matching screenshot
  const payloadCards = [
    {
      id: "rgb",
      name: "RGB Camera",
      desc: "High resolution visual imaging",
      stock: 24,
      category: "Imaging",
      icon: Camera,
      color: "text-[#2563EB]",
      bg: "bg-[#2563EB]/10",
    },
    {
      id: "thermal",
      name: "Thermal Camera",
      desc: "Detect heat signatures day or night",
      stock: 14,
      category: "Inspection",
      icon: Flame,
      color: "text-[#F97316]",
      bg: "bg-[#F97316]/10",
    },
    {
      id: "lidar",
      name: "LiDAR",
      desc: "3D mapping and high-precision models",
      stock: 5,
      category: "Mapping",
      icon: Layers,
      color: "text-[#38BDF8]",
      bg: "bg-[#38BDF8]/10",
    },
    {
      id: "multispectral",
      name: "Multispectral",
      desc: "Vegetation, crop and environmental analysis",
      stock: 6,
      category: "Environmental",
      icon: Zap,
      color: "text-[#10B981]",
      bg: "bg-[#10B981]/10",
    },
    {
      id: "gas",
      name: "Gas Sensor",
      desc: "Detect methane, CO2, H2S and more",
      stock: 4,
      category: "Environmental",
      icon: Radio,
      color: "text-[#EAB308]",
      bg: "bg-[#EAB308]/10",
    },
    {
      id: "zoom",
      name: "Zoom Camera",
      desc: "Long range inspection and surveillance",
      stock: 9,
      category: "Security",
      icon: Eye,
      color: "text-[#8B5CF6]",
      bg: "bg-[#8B5CF6]/10",
    },
    {
      id: "speaker",
      name: "Speaker / Siren",
      desc: "Audio communication and alerts",
      stock: 6,
      category: "Security",
      icon: Volume2,
      color: "text-[#EC4899]",
      bg: "bg-[#EC4899]/10",
    },
    {
      id: "drop",
      name: "Drop Mechanism",
      desc: "Deliver payloads, e.g. sensors, supplies",
      stock: 3,
      category: "Other",
      icon: Package,
      color: "text-[#64748B]",
      bg: "bg-[#64748B]/10",
    },
  ];

  // Calibration due list
  const calibrationItems = [
    { id: "T-07", name: "Thermal Camera · unit T-07", check: "Blackbody check due 18 Sep", days: "2 days", badge: "bg-[#FED7AA] text-[#C2410C]" },
    { id: "L-02", name: "LiDAR · unit L-02", check: "Boresight calibration due 19 Sep", days: "3 days", badge: "bg-[#FEF3C7] text-[#B45309]" },
    { id: "G-01", name: "Gas Sensor · unit G-01", check: "Span gas check due 21 Sep", days: "5 days", badge: "bg-[#FEF3C7] text-[#B45309]" },
    { id: "M-04", name: "Multispectral · unit M-04", check: "Reflectance panel due 22 Sep", days: "6 days", badge: "bg-[#FEF3C7] text-[#B45309]" },
  ];

  // Compatibility matrix exact data
  const matrixData = [
    { name: "RGB Camera", m350: true, autel: true, mavic: true, wingtra: true, ebee: true, volansi: false },
    { name: "Thermal Camera", m350: true, autel: true, mavic: true, wingtra: false, ebee: false, volansi: false },
    { name: "LiDAR", m350: true, autel: false, mavic: false, wingtra: true, ebee: false, volansi: false },
    { name: "Multispectral", m350: true, autel: false, mavic: false, wingtra: true, ebee: true, volansi: false },
    { name: "Gas Sensor", m350: true, autel: true, mavic: false, wingtra: false, ebee: false, volansi: false },
    { name: "Zoom Camera", m350: true, autel: true, mavic: false, wingtra: false, ebee: false, volansi: false },
    { name: "Speaker / Siren", m350: true, autel: true, mavic: true, wingtra: false, ebee: false, volansi: false },
    { name: "Drop Mechanism", m350: true, autel: false, mavic: false, wingtra: false, ebee: false, volansi: true },
  ];

  return (
    <div className="w-full h-full min-h-0 overflow-y-auto overflow-x-hidden flex flex-col bg-[#EEF3F8] text-[#0F172A] font-sans scroll-smooth">
      <div className="p-4 sm:p-5 lg:p-6 max-w-[1780px] w-full mx-auto space-y-4 sm:space-y-5">
        {/* ======================================================================= */}
        {/* 1. HEADER ROW                                                           */}
        {/* ======================================================================= */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1">
          <div>
            <h1 className="text-[26px] sm:text-[28px] lg:text-[30px] font-bold text-[#0F284E] tracking-tight leading-tight">
              Payloads & Sensors
            </h1>
            <p className="text-[13px] sm:text-[14px] text-[#334155] font-medium mt-1">
              What the fleet can carry, what fits what, and what is due for calibration.
            </p>
          </div>

          {toastMsg && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#DCFCE7] border border-[#86EFAC] text-[12px] font-bold text-[#15803D] animate-in fade-in">
              <Check className="w-4 h-4" />
              {toastMsg}
            </div>
          )}
        </div>

        {/* 4 Top KPI Cards (Matching reference screenshot) */}
        <div className="grid grid-cols-1 min-[420px]:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
          {/* Card 1: Payloads in Inventory */}
          <div className="bg-white border border-[#CBD5E1] rounded-xl p-4 flex items-start gap-3.5 shadow-sm transition hover:border-[#94A3B8]">
            <div className="w-11 h-11 rounded-xl bg-[#1B68D2] text-white flex items-center justify-center shrink-0 shadow-xs">
              <Video className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="text-[26px] sm:text-[28px] font-extrabold text-[#0F284E] font-mono leading-none tracking-tight">71</div>
              <div className="text-[13px] font-bold text-[#1E293B] mt-1.5 leading-snug">Payloads in Inventory</div>
              <div className="text-[12px] text-[#475569] font-medium mt-0.5 leading-tight">8 types available</div>
            </div>
          </div>

          {/* Card 2: Mounted Now */}
          <div className="bg-white border border-[#CBD5E1] rounded-xl p-4 flex items-start gap-3.5 shadow-sm transition hover:border-[#94A3B8]">
            <div className="w-11 h-11 rounded-xl bg-[#16A34A] text-white flex items-center justify-center shrink-0 shadow-xs">
              <Layers className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="text-[26px] sm:text-[28px] font-extrabold text-[#0F284E] font-mono leading-none tracking-tight">23</div>
              <div className="text-[13px] font-bold text-[#1E293B] mt-1.5 leading-snug">Mounted Now</div>
              <div className="text-[12px] text-[#16A34A] font-bold mt-0.5 leading-tight">Active in field</div>
            </div>
          </div>

          {/* Card 3: Calibration Due */}
          <div className="bg-white border border-[#CBD5E1] rounded-xl p-4 flex items-start gap-3.5 shadow-sm transition hover:border-[#94A3B8]">
            <div className="w-11 h-11 rounded-xl bg-[#D97706] text-white flex items-center justify-center shrink-0 shadow-xs">
              <Crosshair className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="text-[26px] sm:text-[28px] font-extrabold text-[#0F284E] font-mono leading-none tracking-tight">4</div>
              <div className="text-[13px] font-bold text-[#1E293B] mt-1.5 leading-snug">Calibration Due (7 days)</div>
              <div className="text-[12px] text-[#D97706] font-bold mt-0.5 leading-tight">Maintenance flagged</div>
            </div>
          </div>

          {/* Card 4: Fixed Cameras Linked */}
          <div className="bg-white border border-[#CBD5E1] rounded-xl p-4 flex items-start gap-3.5 shadow-sm transition hover:border-[#94A3B8]">
            <div className="w-11 h-11 rounded-xl bg-[#0F284E] text-[#35E0FF] flex items-center justify-center shrink-0 shadow-xs">
              <Camera className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="text-[26px] sm:text-[28px] font-extrabold text-[#0F284E] font-mono leading-none tracking-tight">42</div>
              <div className="text-[13px] font-bold text-[#1E293B] mt-1.5 leading-snug">Fixed Cameras Linked</div>
              <div className="text-[12px] text-[#475569] font-medium mt-0.5 leading-tight">40 online</div>
            </div>
          </div>
        </div>

        {/* ======================================================================= */}
        {/* 2. PAYLOAD INVENTORY & CALIBRATION / USAGE SIDEBAR                      */}
        {/* ======================================================================= */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* --------------------------------------------------------------------- */}
          {/* LEFT: PAYLOAD INVENTORY (8 CARDS GRID) (lg:col-span-8)               */}
          {/* --------------------------------------------------------------------- */}
          <div className="lg:col-span-8 bg-white border border-[#CBD5E1] rounded-xl p-4 sm:p-5 space-y-3.5 shadow-sm">
            <div className="flex items-center justify-between pb-2 border-b border-[#E2E8F0]">
              <h2 className="text-[15px] sm:text-[16px] font-bold text-[#0F284E] tracking-tight">
                Payload inventory
              </h2>
              <span className="text-[12px] font-semibold text-[#64748B]">8 types available</span>
            </div>

            {/* 8 Cards Grid (4 cols x 2 rows) matching screenshot */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
              {payloadCards.map((card) => {
                const Icon = card.icon;
                const isSelected = selectedPayloadId === card.id;
                const payloadImg = getPayloadImage(card.id);
                return (
                  <div
                    key={card.id}
                    onClick={() => {
                      setSelectedPayloadId(card.id);
                      showToast(`Selected ${card.name} for inspection`);
                    }}
                    className={`p-3.5 rounded-xl border transition cursor-pointer flex flex-col justify-between min-h-[165px] group ${
                      isSelected
                        ? "border-[#1B68D2] bg-[#EFF6FF] shadow-xs ring-2 ring-[#1B68D2]"
                        : "border-[#CBD5E1] bg-white hover:bg-[#F8FAFC] hover:border-[#94A3B8]"
                    }`}
                  >
                    <div>
                      {/* Product Image */}
                      <div className="w-full h-22 sm:h-24 rounded-lg bg-white flex items-center justify-center mb-2.5 overflow-hidden border border-slate-100 shadow-2xs">
                        {payloadImg ? (
                          <img
                            src={payloadImg}
                            alt={card.name}
                            className="w-full h-full object-contain p-1.5 transition-transform duration-300 group-hover:scale-105"
                            loading="lazy"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                              if (e.currentTarget.nextSibling) {
                                e.currentTarget.nextSibling.style.display = 'flex';
                              }
                            }}
                          />
                        ) : null}
                        <div
                          className={`w-9 h-9 rounded-lg ${card.bg} items-center justify-center ${card.color}`}
                          style={{ display: payloadImg ? 'none' : 'flex' }}
                        >
                          <Icon className="w-5 h-5" />
                        </div>
                      </div>

                      <div className={`font-bold text-[14px] transition-colors ${
                        isSelected ? "text-[#1B68D2]" : "text-[#0F284E]"
                      }`}>
                        {card.name}
                      </div>
                      <p className="text-[12px] text-[#475569] font-medium mt-0.5 leading-snug line-clamp-2">
                        {card.desc}
                      </p>
                    </div>

                    <div className="pt-2.5 border-t border-[#E2E8F0] flex items-center justify-between text-[11px] mt-2.5">
                      <span className="font-mono font-bold text-[#1B68D2] bg-[#EFF6FF] px-2 py-0.5 rounded border border-[#BFDBFE]">
                        {card.stock} in stock
                      </span>
                      <span className="bg-[#F8FAFC] border border-[#CBD5E1] text-[#334155] px-2 py-0.5 rounded font-semibold">
                        {card.category}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="text-[12px] text-[#64748B] pt-1">
              Select a payload to configure it on a mission.
            </div>
          </div>

          {/* --------------------------------------------------------------------- */}
          {/* RIGHT: CALIBRATION DUE & USE THIS WEEK (lg:col-span-4)               */}
          {/* --------------------------------------------------------------------- */}
          <div className="lg:col-span-4 flex flex-col gap-4">
            {/* Calibration Due Box */}
            <div className="bg-white border border-[#CBD5E1] rounded-xl p-4 sm:p-5 space-y-3 shadow-sm">
              <h3 className="text-[13px] font-bold text-[#0F284E] tracking-tight uppercase">
                Calibration due
              </h3>

              <div className="space-y-2 text-[12px]">
                {calibrationItems.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => showToast(`Calibration requested for ${item.name}`)}
                    className="p-2.5 rounded-lg border border-[#CBD5E1] bg-[#F8FAFC] hover:bg-white hover:border-[#D97706] transition cursor-pointer flex items-center justify-between"
                  >
                    <div>
                      <div className="font-bold text-[#0F284E] text-[12.5px]">{item.name}</div>
                      <div className="text-[11px] text-[#64748B] font-medium">{item.check}</div>
                    </div>
                    <span className={`px-2 py-0.5 rounded font-mono font-bold text-[11px] ${item.badge}`}>
                      {item.days}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Use This Week Horizontal Frequency Bars */}
            <div className="bg-white border border-[#CBD5E1] rounded-xl p-4 sm:p-5 space-y-3 shadow-sm">
              <h3 className="text-[13px] font-bold text-[#0F284E] tracking-tight uppercase">
                Use this week
              </h3>

              <div className="space-y-2 text-[12px]">
                {[
                  { name: "RGB Camera", count: 96, max: 96 },
                  { name: "Thermal Camera", count: 58, max: 96 },
                  { name: "Zoom Camera", count: 33, max: 96 },
                  { name: "LiDAR", count: 14, max: 96 },
                  { name: "Multispectral", count: 12, max: 96 },
                  { name: "Gas Sensor", count: 9, max: 96 },
                ].map((item) => (
                  <div key={item.name} className="flex items-center gap-3">
                    <span className="w-32 text-[#334155] font-semibold text-[12px] truncate">{item.name}</span>
                    <div className="flex-1 h-3 rounded bg-[#F1F5F9] overflow-hidden">
                      <div
                        className="h-full bg-[#1B68D2]"
                        style={{ width: `${(item.count / item.max) * 100}%` }}
                      />
                    </div>
                    <span className="w-6 font-mono font-bold text-right text-[12px] text-[#0F284E]">
                      {item.count}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ======================================================================= */}
        {/* 3. WHAT FITS WHAT: COMPATIBILITY MATRIX TABLE                           */}
        {/* ======================================================================= */}
        <div className="bg-white border border-[#CBD5E1] rounded-xl p-4 sm:p-5 space-y-3.5 shadow-sm">
          <div className="flex items-center justify-between pb-2 border-b border-[#E2E8F0]">
            <h2 className="text-[15px] sm:text-[16px] font-bold text-[#0F284E] tracking-tight">
              What fits what
            </h2>
            <span className="text-[12px] text-[#64748B] font-medium">
              Payload-to-airframe compatibility matrix
            </span>
          </div>

          <div className="overflow-x-auto border border-[#E2E8F0] rounded-lg">
            <table className="w-full min-w-[680px] text-left">
              <thead className="bg-[#F4F7FB] text-[#0F284E] border-b border-[#CBD5E1] text-[13px] font-bold">
                <tr>
                  <th className="py-3 px-3.5">Payload</th>
                  <th className="py-3 px-3.5 text-center">DJI Matrice 350</th>
                  <th className="py-3 px-3.5 text-center">Autel EVO Max</th>
                  <th className="py-3 px-3.5 text-center">DJI Mavic 3T</th>
                  <th className="py-3 px-3.5 text-center">WingtraOne</th>
                  <th className="py-3 px-3.5 text-center">eBee X</th>
                  <th className="py-3 px-3.5 text-center">Volansi VOLY</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0] text-[13px] text-[#1E293B]">
                {matrixData.map((row) => (
                  <tr key={row.name} className="hover:bg-[#F8FAFC] transition">
                    <td className="py-3 px-3.5 font-bold text-[#0F284E]">{row.name}</td>
                    <td className="py-3 px-3.5 text-center">
                      {row.m350 ? <span className="text-[#16A34A] font-bold text-base">✓</span> : <span className="text-[#94A3B8]">—</span>}
                    </td>
                    <td className="py-3 px-3.5 text-center">
                      {row.autel ? <span className="text-[#16A34A] font-bold text-base">✓</span> : <span className="text-[#94A3B8]">—</span>}
                    </td>
                    <td className="py-3 px-3.5 text-center">
                      {row.mavic ? <span className="text-[#16A34A] font-bold text-base">✓</span> : <span className="text-[#94A3B8]">—</span>}
                    </td>
                    <td className="py-3 px-3.5 text-center">
                      {row.wingtra ? <span className="text-[#16A34A] font-bold text-base">✓</span> : <span className="text-[#94A3B8]">—</span>}
                    </td>
                    <td className="py-3 px-3.5 text-center">
                      {row.ebee ? <span className="text-[#16A34A] font-bold text-base">✓</span> : <span className="text-[#94A3B8]">—</span>}
                    </td>
                    <td className="py-3 px-3.5 text-center">
                      {row.volansi ? <span className="text-[#16A34A] font-bold text-base">✓</span> : <span className="text-[#94A3B8]">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Footnote (Matching reference) */}
          <p className="text-[12px] text-[#64748B] font-medium">
            Mission Planning uses this table: it only offers payloads the chosen drone can carry and power.
          </p>
        </div>

        {/* ======================================================================= */}
        {/* 4. FOOTER VALUES / ASSURANCE STRIP                                     */}
        {/* ======================================================================= */}
        <div className="bg-white border border-[#CBD5E1] rounded-xl p-3.5 shadow-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3.5 text-center md:text-left divide-y sm:divide-y-0 md:divide-x divide-[#E2E8F0]">
            <div className="flex items-center gap-3 px-2">
              <Compass className="w-5 h-5 text-[#1B68D2] shrink-0" />
              <div>
                <span className="text-[13px] font-bold text-[#0F284E] block">Plan with Confidence</span>
                <span className="text-[11px] text-[#64748B]">Accurate, efficient and safe missions.</span>
              </div>
            </div>
            <div className="flex items-center gap-3 px-2 pt-2 md:pt-0">
              <Zap className="w-5 h-5 text-[#1B68D2] shrink-0" />
              <div>
                <span className="text-[13px] font-bold text-[#0F284E] block">Multi-Drone, Multi-Use</span>
                <span className="text-[11px] text-[#64748B]">Any industry. Any environment.</span>
              </div>
            </div>
            <div className="flex items-center gap-3 px-2 pt-2 md:pt-0">
              <BarChart3 className="w-5 h-5 text-[#1B68D2] shrink-0" />
              <div>
                <span className="text-[13px] font-bold text-[#0F284E] block">From Data to Decisions</span>
                <span className="text-[11px] text-[#64748B]">Turn aerial data into real value.</span>
              </div>
            </div>
            <div className="flex items-center gap-3 px-2 pt-2 md:pt-0">
              <Shield className="w-5 h-5 text-[#1B68D2] shrink-0" />
              <div>
                <span className="text-[13px] font-bold text-[#0F284E] block">Safer Operations</span>
                <span className="text-[11px] text-[#64748B]">People. Assets. Communities.</span>
              </div>
            </div>
            <div className="flex flex-col justify-center px-2 pt-2 md:pt-0">
              <span className="text-[11px] font-mono tracking-widest font-extrabold text-[#0F284E] uppercase">
                One Fleet. Any Mission.
              </span>
              <span className="text-[11px] font-bold text-[#1B68D2] uppercase tracking-wider">
                Always Ready.
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PayloadsSensorsPage;
