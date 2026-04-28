"use client";

import { useEffect, useCallback, useState } from "react";
import type { Product } from "@/lib/types";
import { submitInquiry } from "@/app/actions";
import { getPublicSpecs } from "@/lib/public-specs";

interface SlideOverProps {
  product: Product | null;
  onClose: () => void;
}

export default function ProductSlideOver({ product, onClose }: SlideOverProps) {
  const [imgError, setImgError] = useState(false);
  const [activeImgIdx, setActiveImgIdx] = useState(0);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [submitState, setSubmitState] = useState<"idle" | "loading" | "success" | "error">("idle");
  const publicSpecs = getPublicSpecs(product?.Specs);

  const handleKey = useCallback(
    (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); },
    [onClose]
  );

  useEffect(() => {
    if (!product) return;
    document.addEventListener("keydown", handleKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = "";
    };
  }, [product, handleKey]);

  if (!product) return null;

  async function handleInquiry(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!product) return;
    setSubmitState("loading");
    try {
      await submitInquiry(new FormData(e.currentTarget), product.id, product.Name);
      setSubmitState("success");
    } catch {
      setSubmitState("error");
      alert("Грешка при изпращане.");
    }
  }

  const images = product.Images || [];
  const currentImg = images[activeImgIdx] || images[0] || "";
  const hasMultipleImages = images.length > 1;

  function showImageAt(index: number) {
    if (images.length === 0) return;
    setImgError(false);
    setActiveImgIdx((index + images.length) % images.length);
  }

  function showPreviousImage() {
    showImageAt(activeImgIdx - 1);
  }

  function showNextImage() {
    showImageAt(activeImgIdx + 1);
  }

  function handleTouchEnd(e: React.TouchEvent<HTMLDivElement>) {
    if (touchStartX === null || !hasMultipleImages) return;

    const deltaX = e.changedTouches[0].clientX - touchStartX;
    if (Math.abs(deltaX) > 45) {
      if (deltaX < 0) {
        showNextImage();
      } else {
        showPreviousImage();
      }
    }

    setTouchStartX(null);
  }

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] transition-opacity duration-300" 
        onClick={onClose}
      />
      
      {/* Main Panel - Wider "Expanded" View */}
      <div className="fixed top-0 right-0 h-full w-full max-w-[1200px] bg-white z-[110] shadow-2xl flex flex-col overflow-hidden transition-transform duration-500 ease-out font-['Inter',sans-serif]">
        
        {/* Header - Simple & Clean */}
        <div className="flex justify-between items-start px-8 py-8 border-b bg-white sticky top-0 z-20">
          <div>
             <div className="text-[10px] font-black text-orange-600 uppercase tracking-[0.4em] mb-2">ASTRALIS | ПРОДУКТОВ КАТАЛОГ</div>
             <h2 className="text-4xl font-black text-[#1A1A1A] leading-tight max-w-[800px]">{product.Name}</h2>
          </div>
          <button 
            onClick={onClose} 
            className="w-12 h-12 flex items-center justify-center hover:bg-gray-100 rounded-full transition-all text-gray-400 hover:text-black mt-2"
          >
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
          
          {/* TOP SECTION: IMAGE + SPECS (Like Bauportal) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 p-8 lg:p-12">
            
            {/* Left: Image Gallery */}
            <div className="lg:col-span-7">
              <div
                className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-white to-gray-100 aspect-[16/10] shadow-inner mb-6 border border-gray-100 p-6 select-none"
                onTouchStart={(e) => setTouchStartX(e.touches[0].clientX)}
                onTouchEnd={handleTouchEnd}
              >
                <img 
                  src={imgError ? "/images/hero-main.png" : currentImg} 
                  alt={product.Name}
                  className="w-full h-full object-contain"
                  onError={() => setImgError(true)}
                />
                <div className="absolute top-6 left-6 bg-white/90 backdrop-blur px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-widest text-orange-600 shadow-sm border border-orange-100">
                   НОВ МОДЕЛ
                </div>

                {hasMultipleImages && (
                  <>
                    <button
                      type="button"
                      onClick={showPreviousImage}
                      className="absolute left-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/90 text-[#1A1A1A] shadow-lg border border-gray-100 flex items-center justify-center hover:bg-orange-600 hover:text-white transition-all"
                      aria-label="Предишна снимка"
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                        <path d="M15 18l-6-6 6-6" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={showNextImage}
                      className="absolute right-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/90 text-[#1A1A1A] shadow-lg border border-gray-100 flex items-center justify-center hover:bg-orange-600 hover:text-white transition-all"
                      aria-label="Следваща снимка"
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                        <path d="M9 18l6-6-6-6" />
                      </svg>
                    </button>
                    <div className="absolute bottom-4 right-4 rounded-full bg-black/70 text-white text-[10px] font-black uppercase tracking-widest px-3 py-1.5">
                      {activeImgIdx + 1} / {images.length}
                    </div>
                  </>
                )}
              </div>

              {/* Thumbnails */}
              {hasMultipleImages && (
                <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
                  {images.map((img, idx) => (
                    <button 
                      key={idx} 
                      onClick={() => showImageAt(idx)}
                      className={`w-28 h-20 flex-shrink-0 rounded-2xl border-2 transition-all overflow-hidden bg-white p-2 ${activeImgIdx === idx ? 'border-orange-500 shadow-lg scale-95' : 'border-transparent opacity-50 hover:opacity-100'}`}
                    >
                      <img src={img} alt={`${product.Name} ${idx + 1}`} className="w-full h-full object-contain" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Right: Technical Specs Table (Replaces business card) */}
            <div className="lg:col-span-5 flex flex-col gap-6">
              <div className="bg-white border border-gray-100 rounded-3xl shadow-sm overflow-hidden h-full flex flex-col">
                <div className="bg-gray-50/50 px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                   <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Технически характеристики</h3>
                   <span className="text-[10px] font-bold text-orange-500 bg-orange-50 px-2 py-1 rounded-md">Bautrax Original</span>
                </div>
                      <div className="flex-1 overflow-y-auto">
                  {Object.entries(publicSpecs).length > 0 ? (
                    Object.entries(publicSpecs).map(([key, value], idx) => (
                      <div key={key} className={`flex justify-between items-center px-6 py-4 border-b border-gray-50 last:border-0 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/20'}`}>
                        <span className="text-gray-500 font-semibold text-xs">{key}</span>
                        <span className="text-[#1A1A1A] font-black text-xs text-right ml-4">{value}</span>
                      </div>
                    ))
                  ) : (
                    <div className="p-12 text-center text-gray-400 text-xs font-bold uppercase tracking-widest">
                       Зареждане на параметри...
                    </div>
                  )}
                </div>
                {/* Price tag at the bottom of the table area */}
                <div className="p-6 bg-orange-600 text-white">
                  <div className="text-[10px] font-black uppercase tracking-widest opacity-80 mb-1">Ориентировъчна цена</div>
                  <div className="text-3xl font-black">{product.Price || "По запитване"}</div>
                </div>
              </div>
            </div>
          </div>

          {/* BOTTOM SECTION: LONG DESCRIPTION (Full Width) */}
          <div className="p-8 lg:p-12 border-t border-gray-100 bg-gray-50/30">
            <div className="max-w-4xl mx-auto">
              {/* Long Description Area */}
              <div className="mb-16">
                <h3 className="text-xl font-black text-[#1A1A1A] mb-8 flex items-center gap-4">
                   <span className="w-12 h-1 bg-orange-600 rounded-full"></span>
                   Детайлно описание
                </h3>
                <div className="text-gray-700 leading-[1.9] text-lg font-medium whitespace-pre-line space-y-4">
                  {product.Description ? (
                    product.Description.split('\n').map((line, i) => (
                      <p key={i} className={line.startsWith('•') ? 'pl-6 -indent-6' : ''}>
                        {line}
                      </p>
                    ))
                  ) : (
                    "Подробното описание се подготвя..."
                  )}
                </div>
              </div>

              {/* Inquiry Button Card */}
              <div className="bg-white p-10 rounded-[2.5rem] border-2 border-orange-100 shadow-xl text-center">
                  {!showForm ? (
                    <div className="space-y-6">
                      <h4 className="text-2xl font-black text-[#1A1A1A]">Интересувате ли се от този модел?</h4>
                      <p className="text-gray-500 font-bold max-w-lg mx-auto">Изпратете запитване за оферта и наш представител ще се свърже с Вас в рамките на работния ден.</p>
                      <button 
                        onClick={() => setShowForm(true)}
                        className="bg-orange-600 hover:bg-orange-700 text-white font-black py-6 px-12 rounded-2xl transition-all shadow-2xl shadow-orange-600/30 uppercase tracking-[0.2em] text-sm inline-flex items-center gap-4 group"
                      >
                        Изпрати запитване за оферта
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="group-hover:translate-x-2 transition-transform">
                          <path d="M5 12h14m-7-7l7 7-7 7" />
                        </svg>
                      </button>
                    </div>
                  ) : (
                    <div className="max-w-md mx-auto animate-in fade-in zoom-in duration-300">
                       {submitState === "success" ? (
                         <div className="py-8">
                            <div className="w-20 h-20 bg-green-500 text-white rounded-full flex items-center justify-center mx-auto mb-6 text-4xl shadow-lg">✓</div>
                            <h3 className="text-2xl font-black text-[#1A1A1A] mb-2">Запитването е прието!</h3>
                            <p className="text-gray-500 font-bold">Ще се свържем с Вас съвсем скоро.</p>
                            <button onClick={onClose} className="mt-8 font-black text-orange-600 uppercase tracking-widest text-xs hover:underline">Затвори</button>
                         </div>
                       ) : (
                         <form onSubmit={handleInquiry} className="space-y-4">
                            <div className="flex justify-between items-center mb-4">
                              <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">Контактни данни</h3>
                              <button type="button" onClick={() => setShowForm(false)} className="text-[10px] font-black text-red-500 uppercase hover:underline">Отказ</button>
                            </div>
                            <input name="name" required placeholder="Вашето име *" className="w-full p-5 bg-gray-50 border-2 border-transparent focus:border-orange-500 rounded-2xl outline-none font-bold text-sm transition-all" />
                            <input name="phone" required type="tel" placeholder="Телефон за връзка *" className="w-full p-5 bg-gray-50 border-2 border-transparent focus:border-orange-500 rounded-2xl outline-none font-bold text-sm transition-all" />
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <select name="assembled" className="w-full p-4 bg-gray-50 border-2 border-transparent focus:border-orange-500 rounded-2xl outline-none font-medium text-sm transition-all">
                                <option value="">Доставка във вид</option>
                                <option value="Сглобен">Сглобен</option>
                                <option value="Несглобен">Несглобен</option>
                              </select>
                              <select name="el" className="w-full p-4 bg-gray-50 border-2 border-transparent focus:border-orange-500 rounded-2xl outline-none font-medium text-sm transition-all">
                                <option value="">Ел. инсталация</option>
                                <option value="Да, желая">Да, желая</option>
                                <option value="Не">Не</option>
                              </select>
                              <select name="vik" className="w-full p-4 bg-gray-50 border-2 border-transparent focus:border-orange-500 rounded-2xl outline-none font-medium text-sm transition-all">
                                <option value="">ВиК инсталация</option>
                                <option value="Да, желая">Да, желая</option>
                                <option value="Не">Не</option>
                              </select>
                              <select name="transport" className="w-full p-4 bg-gray-50 border-2 border-transparent focus:border-orange-500 rounded-2xl outline-none font-medium text-sm transition-all">
                                <option value="">Транспорт</option>
                                <option value="Имам собствен">Имам собствен</option>
                                <option value="Търся от вас">Търся от вас</option>
                              </select>
                              <select name="crane" className="w-full p-4 bg-gray-50 border-2 border-transparent focus:border-orange-500 rounded-2xl outline-none font-medium text-sm transition-all sm:col-span-2">
                                <option value="">Достъп за кран</option>
                                <option value="Има достъп">Има достъп</option>
                                <option value="Няма">Няма</option>
                              </select>
                            </div>
                            <input name="budget" placeholder="Бюджет" className="w-full p-5 bg-gray-50 border-2 border-transparent focus:border-orange-500 rounded-2xl outline-none font-medium text-sm transition-all" />
                            <textarea name="message" rows={3} placeholder="Допълнителни коментари..." className="w-full p-5 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-orange-500 outline-none font-medium text-sm"></textarea>
                            <button 
                              type="submit" 
                              disabled={submitState === "loading"}
                              className="w-full bg-[#1A1A1A] hover:bg-black text-white font-black py-5 rounded-2xl transition-all disabled:opacity-50 uppercase tracking-widest text-xs shadow-xl"
                            >
                              {submitState === "loading" ? "Изпращане..." : "Потвърди запитването"}
                            </button>
                         </form>
                       )}
                    </div>
                  )}
               </div>
            </div>
          </div>

        </div>

        {/* Footer info */}
        <div className="px-8 py-4 border-t border-gray-100 bg-white text-center">
           <span className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">© 2024 Astralis Build | Индустриални Контейнери и Модулни Сгради</span>
        </div>

      </div>

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #E5E5E5; border-radius: 10px; }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
      `}</style>
    </>
  );
}
