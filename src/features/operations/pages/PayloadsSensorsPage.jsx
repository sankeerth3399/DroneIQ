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
    <div className="w-full h-full min-h-0 overflow-y-auto overflow-x-hidden flex flex-col bg-[#F8FAFC] text-[#0F172A] font-sans scroll-smooth">
      <div className="p-3 sm:p-4 lg:p-6 max-w-[1720px] w-full mx-auto space-y-4">
        {/* ======================================================================= */}
        {/* 1. HEADER ROW                                                           */}
        {/* ======================================================================= */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl lg:text-2xl font-black text-[#0B1F3D] tracking-tight">
              Payloads & Sensors
            </h1>
            <p className="text-xs text-[#64748B] mt-0.5">
              What the fleet can carry, what fits what, and what is due for calibration.
            </p>
          </div>

          {toastMsg && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#DCFCE7] border border-[#86EFAC] text-xs font-bold text-[#15803D] animate-in fade-in">
              <Check className="w-3.5 h-3.5" />
              {toastMsg}
            </div>
          )}
        </div>

        {/* 4 Top KPI Cards (Matching reference screenshot) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Card 1: Payloads in Inventory */}
          <div className="bg-white border border-[#E2E8F0] rounded-xl p-3.5 flex items-center gap-3.5 shadow-sm">
            <div className="w-10 h-10 rounded-lg bg-[#2563EB]/10 border border-[#2563EB]/25 flex items-center justify-center text-[#2563EB] shrink-0">
              <Video className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xl font-extrabold text-[#0B1F3D] tracking-tight">71</div>
              <div className="text-[11px] font-bold text-[#334155]">Payloads in Inventory</div>
              <div className="text-[10px] text-[#64748B]">8 types</div>
            </div>
          </div>

          {/* Card 2: Mounted Now */}
          <div className="bg-white border border-[#E2E8F0] rounded-xl p-3.5 flex items-center gap-3.5 shadow-sm">
            <div className="w-10 h-10 rounded-lg bg-[#16A34A]/10 border border-[#16A34A]/25 flex items-center justify-center text-[#16A34A] shrink-0">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xl font-extrabold text-[#0B1F3D] tracking-tight">23</div>
              <div className="text-[11px] font-bold text-[#334155]">Mounted Now</div>
              <div className="text-[10px] text-[#16A34A] font-semibold">Active in field</div>
            </div>
          </div>

          {/* Card 3: Calibration Due */}
          <div className="bg-white border border-[#E2E8F0] rounded-xl p-3.5 flex items-center gap-3.5 shadow-sm">
            <div className="w-10 h-10 rounded-lg bg-[#F97316]/10 border border-[#F97316]/25 flex items-center justify-center text-[#EA580C] shrink-0">
              <Crosshair className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xl font-extrabold text-[#0B1F3D] tracking-tight">4</div>
              <div className="text-[11px] font-bold text-[#334155]">Calibration Due (7 days)</div>
              <div className="text-[10px] text-[#EA580C] font-semibold">Maintenance flagged</div>
            </div>
          </div>

          {/* Card 4: Fixed Cameras Linked */}
          <div className="bg-white border border-[#E2E8F0] rounded-xl p-3.5 flex items-center gap-3.5 shadow-sm">
            <div className="w-10 h-10 rounded-lg bg-[#0284C7]/10 border border-[#0284C7]/25 flex items-center justify-center text-[#0284C7] shrink-0">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xl font-extrabold text-[#0B1F3D] tracking-tight">42</div>
              <div className="text-[11px] font-bold text-[#334155]">Fixed Cameras Linked</div>
              <div className="text-[10px] text-[#64748B]">40 online</div>
            </div>
          </div>
        </div>

        {/* ======================================================================= */}
        {/* 2. PAYLOAD INVENTORY & CALIBRATION / USAGE SIDEBAR                      */}
        {/* ======================================================================= */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5">
          {/* --------------------------------------------------------------------- */}
          {/* LEFT: PAYLOAD INVENTORY (8 CARDS GRID) (lg:col-span-8)               */}
          {/* --------------------------------------------------------------------- */}
          <div className="lg:col-span-8 bg-white border border-[#E2E8F0] rounded-xl p-4 space-y-3 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-xs sm:text-sm font-bold text-[#0F172A] tracking-tight">
                Payload inventory
              </h2>
              <span className="text-[11px] text-[#64748B]">8 types available</span>
            </div>

            {/* 8 Cards Grid (4 cols x 2 rows) matching screenshot */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-2.5">
              {payloadCards.map((card) => {
                const Icon = card.icon;
                const isSelected = selectedPayloadId === card.id;
                return (
                  <div
                    key={card.id}
                    onClick={() => {
                      setSelectedPayloadId(card.id);
                      showToast(`Selected ${card.name} for inspection`);
                    }}
                    className={`p-3 rounded-xl border transition cursor-pointer flex flex-col justify-between min-h-[140px] ${
                      isSelected
                        ? "border-[#2563EB] bg-[#EFF6FF] shadow-xs ring-1 ring-[#2563EB]"
                        : "border-[#E2E8F0] bg-[#F8FAFC] hover:bg-white hover:border-[#CBD5E1]"
                    }`}
                  >
                    <div>
                      {/* Icon */}
                      <div className={`w-9 h-9 rounded-lg ${card.bg} flex items-center justify-center ${card.color} mb-2`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="font-extrabold text-xs text-[#0F172A]">{card.name}</div>
                      <p className="text-[10.5px] text-[#64748B] mt-0.5 leading-snug line-clamp-2">
                        {card.desc}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-[#E2E8F0] flex items-center justify-between text-[10px] mt-2">
                      <span className="font-mono font-bold text-[#2563EB]">{card.stock} in stock</span>
                      <span className="bg-white border border-[#E2E8F0] text-[#475569] px-1.5 py-0.5 rounded font-semibold">
                        {card.category}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="text-[10.5px] text-[#64748B] pt-1">
              Select a payload to configure it on a mission.
            </div>
          </div>

          {/* --------------------------------------------------------------------- */}
          {/* RIGHT: CALIBRATION DUE & USE THIS WEEK (lg:col-span-4)               */}
          {/* --------------------------------------------------------------------- */}
          <div className="lg:col-span-4 flex flex-col gap-3.5">
            {/* Calibration Due Box */}
            <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 space-y-2.5 shadow-sm">
              <h3 className="text-xs font-bold text-[#0F172A] tracking-tight uppercase">
                Calibration due
              </h3>

              <div className="space-y-2 text-xs">
                {calibrationItems.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => showToast(`Calibration requested for ${item.name}`)}
                    className="p-2 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] hover:bg-white hover:border-[#F97316] transition cursor-pointer flex items-center justify-between"
                  >
                    <div>
                      <div className="font-bold text-[#0F172A] text-[11.5px]">{item.name}</div>
                      <div className="text-[10px] text-[#64748B]">{item.check}</div>
                    </div>
                    <span className={`px-2 py-0.5 rounded font-mono font-bold text-[10px] ${item.badge}`}>
                      {item.days}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Use This Week Horizontal Frequency Bars */}
            <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 space-y-2.5 shadow-sm">
              <h3 className="text-xs font-bold text-[#0F172A] tracking-tight uppercase">
                Use this week
              </h3>

              <div className="space-y-1.5 text-xs">
                {[
                  { name: "RGB Camera", count: 96, max: 96 },
                  { name: "Thermal Camera", count: 58, max: 96 },
                  { name: "Zoom Camera", count: 33, max: 96 },
                  { name: "LiDAR", count: 14, max: 96 },
                  { name: "Multispectral", count: 12, max: 96 },
                  { name: "Gas Sensor", count: 9, max: 96 },
                ].map((item) => (
                  <div key={item.name} className="flex items-center gap-3">
                    <span className="w-28 text-[#475569] text-[11px] truncate">{item.name}</span>
                    <div className="flex-1 h-3 rounded bg-[#F1F5F9] overflow-hidden">
                      <div
                        className="h-full bg-[#2563EB]"
                        style={{ width: `${(item.count / item.max) * 100}%` }}
                      />
                    </div>
                    <span className="w-5 font-mono font-bold text-right text-[11px] text-[#0F172A]">
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
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 space-y-3 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-xs sm:text-sm font-bold text-[#0F172A] tracking-tight">
              What fits what
            </h2>
            <span className="text-[11px] text-[#64748B]">
              Payload-to-airframe compatibility matrix
            </span>
          </div>

          <div className="overflow-x-auto border border-[#E2E8F0] rounded-lg">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F8FAFC] text-[#64748B] border-b border-[#E2E8F0] text-[11px] font-semibold">
                <tr>
                  <th className="py-2.5 px-3">Payload</th>
                  <th className="py-2.5 px-3 text-center">DJI Matrice 350</th>
                  <th className="py-2.5 px-3 text-center">Autel EVO Max</th>
                  <th className="py-2.5 px-3 text-center">DJI Mavic 3T</th>
                  <th className="py-2.5 px-3 text-center">WingtraOne</th>
                  <th className="py-2.5 px-3 text-center">eBee X</th>
                  <th className="py-2.5 px-3 text-center">Volansi VOLY</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F5F9] text-[11.5px]">
                {matrixData.map((row) => (
                  <tr key={row.name} className="hover:bg-[#F8FAFC] transition">
                    <td className="py-2.5 px-3 font-semibold text-[#0F172A]">{row.name}</td>
                    <td className="py-2.5 px-3 text-center">
                      {row.m350 ? <span className="text-[#16A34A] font-bold text-sm">✓</span> : <span className="text-[#94A3B8]">—</span>}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      {row.autel ? <span className="text-[#16A34A] font-bold text-sm">✓</span> : <span className="text-[#94A3B8]">—</span>}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      {row.mavic ? <span className="text-[#16A34A] font-bold text-sm">✓</span> : <span className="text-[#94A3B8]">—</span>}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      {row.wingtra ? <span className="text-[#16A34A] font-bold text-sm">✓</span> : <span className="text-[#94A3B8]">—</span>}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      {row.ebee ? <span className="text-[#16A34A] font-bold text-sm">✓</span> : <span className="text-[#94A3B8]">—</span>}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      {row.volansi ? <span className="text-[#16A34A] font-bold text-sm">✓</span> : <span className="text-[#94A3B8]">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Footnote (Matching reference) */}
          <p className="text-[10.5px] text-[#64748B]">
            Mission Planning uses this table: it only offers payloads the chosen drone can carry and power.
          </p>
        </div>

        {/* ======================================================================= */}
        {/* 4. FOOTER VALUES / ASSURANCE STRIP                                     */}
        {/* ======================================================================= */}
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-3 shadow-xs">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-center md:text-left divide-y md:divide-y-0 md:divide-x divide-[#F1F5F9]">
            <div className="flex items-center gap-2.5 px-2">
              <Compass className="w-5 h-5 text-[#2563EB] shrink-0" />
              <div>
                <span className="text-xs font-bold text-[#0F172A] block">Plan with Confidence</span>
                <span className="text-[10px] text-[#64748B]">Accurate, efficient and safe missions.</span>
              </div>
            </div>
            <div className="flex items-center gap-2.5 px-2 pt-2 md:pt-0">
              <Zap className="w-5 h-5 text-[#2563EB] shrink-0" />
              <div>
                <span className="text-xs font-bold text-[#0F172A] block">Multi-Drone, Multi-Use</span>
                <span className="text-[10px] text-[#64748B]">Any industry. Any environment.</span>
              </div>
            </div>
            <div className="flex items-center gap-2.5 px-2 pt-2 md:pt-0">
              <BarChart3 className="w-5 h-5 text-[#2563EB] shrink-0" />
              <div>
                <span className="text-xs font-bold text-[#0F172A] block">From Data to Decisions</span>
                <span className="text-[10px] text-[#64748B]">Turn aerial data into real value.</span>
              </div>
            </div>
            <div className="flex items-center gap-2.5 px-2 pt-2 md:pt-0">
              <Shield className="w-5 h-5 text-[#2563EB] shrink-0" />
              <div>
                <span className="text-xs font-bold text-[#0F172A] block">Safer Operations</span>
                <span className="text-[10px] text-[#64748B]">People. Assets. Communities.</span>
              </div>
            </div>
            <div className="flex flex-col justify-center px-2 pt-2 md:pt-0">
              <span className="text-[10px] font-mono tracking-widest font-extrabold text-[#1E293B] uppercase">
                One Fleet. Any Mission.
              </span>
              <span className="text-[10px] font-bold text-[#2563EB] uppercase tracking-wider">
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
