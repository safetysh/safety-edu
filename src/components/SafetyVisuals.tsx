import React from 'react';
import { HazardType, SafetyThemeConfig, TimelineStep } from '../types/safety';

interface PictogramProps {
  hazardType: HazardType;
  size?: number;
  className?: string;
  inkSaver?: boolean;
}

type PictogramCategory =
  | 'struck_object'
  | 'crushed_overturn'
  | 'collapse'
  | 'caught'
  | 'collision'
  | 'fire_explosion'
  | 'electric_shock'
  | 'suffocation'
  | 'fall'
  | 'general';

function resolvePictogramCategory(hazardType: string): PictogramCategory {
  const h = (hazardType || '').trim();
  if (/물체|맞음|낙하|비래/.test(h)) return 'struck_object';
  if (/깔림|뒤집힘|전도|압사/.test(h)) return 'crushed_overturn';
  if (/붕괴|무너짐|매몰/.test(h)) return 'collapse';
  if (/끼임|협착|말림|절단/.test(h)) return 'caught';
  if (/부딪힘|충돌|교통/.test(h)) return 'collision';
  if (/화재|폭발|화상|인화/.test(h)) return 'fire_explosion';
  if (/감전|전기|누전/.test(h)) return 'electric_shock';
  if (/질식|중독|산소|밀폐|가스|화학/.test(h)) return 'suffocation';
  if (/떨어짐|추락|고소/.test(h)) return 'fall';
  return 'general';
}

/**
 * ISO-7010 inspired industrial warning triangle SVG pictograms covering all 9 major hazard types.
 * Zero external image dependencies — works 100% offline & exports cleanly to PNG/PDF.
 */
export const HazardPictogram: React.FC<PictogramProps> = ({
  hazardType,
  size = 64,
  className = '',
  inkSaver = false,
}) => {
  const category = resolvePictogramCategory(hazardType);

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 80 80"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label={`${hazardType} 경고 픽토그램`}
    >
      {/* Safety Warning Triangle */}
      <path
        d="M40 7L74 68H6L40 7Z"
        fill={inkSaver ? '#FFFFFF' : '#FACC15'}
        stroke="#18181B"
        strokeWidth="4.5"
        strokeLinejoin="round"
      />

      {/* 1. 떨어짐 / 추락 */}
      {category === 'fall' && (
        <g>
          <path d="M19 61H41V49H19" fill="#18181B" />
          <circle cx="51" cy="34" r="4" fill="#18181B" />
          <path
            d="M48 39L43 47L49 52L55 60"
            stroke="#18181B"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path d="M45 43L56 41" stroke="#18181B" strokeWidth="3" strokeLinecap="round" />
          <path d="M43 47L37 44" stroke="#18181B" strokeWidth="3" strokeLinecap="round" />
          <path
            d="M58 46V56M58 56L55 53M58 56L61 53"
            stroke="#B91C1C"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>
      )}

      {/* 2. 물체에 맞음 / 낙하물 */}
      {category === 'struck_object' && (
        <g>
          {/* Falling heavy block / object */}
          <rect x="33" y="22" width="14" height="9" rx="1.2" transform="rotate(-12 33 22)" fill="#18181B" />
          {/* Downward impact arrows */}
          <path
            d="M40 34V43M40 43L36.5 39.5M40 43L43.5 39.5"
            stroke="#B91C1C"
            strokeWidth="2.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Worker wearing hard hat */}
          <path d="M33 50C33 46.5 36.2 44.5 40 44.5C43.8 44.5 47 46.5 47 50H33Z" fill="#18181B" />
          <path d="M31 50H49" stroke="#18181B" strokeWidth="2.5" strokeLinecap="round" />
          <circle cx="40" cy="53" r="3.4" fill="#18181B" />
          <path
            d="M32 62C33.5 58 36.5 56.5 40 56.5C43.5 56.5 46.5 58 48 62"
            stroke="#18181B"
            strokeWidth="3.2"
            strokeLinecap="round"
          />
        </g>
      )}

      {/* 3. 깔림 · 뒤집힘 / 전도 */}
      {category === 'crushed_overturn' && (
        <g>
          {/* Tilting heavy equipment / load */}
          <g transform="rotate(24 38 44)">
            <rect x="24" y="34" width="22" height="14" rx="2" fill="#18181B" />
            <circle cx="29" cy="50" r="3" fill="#18181B" />
            <circle cx="41" cy="50" r="3" fill="#18181B" />
          </g>
          {/* Overturn directional arc */}
          <path
            d="M47 29C53 32 56 38 56 45M56 45L52.5 41.5M56 45L59 41"
            stroke="#B91C1C"
            strokeWidth="2.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Ground line & crushed warning zone */}
          <path d="M18 61H62" stroke="#18181B" strokeWidth="3" strokeLinecap="round" />
          <circle cx="53" cy="55" r="3" fill="#18181B" />
          <path d="M46 59H58" stroke="#18181B" strokeWidth="2.6" strokeLinecap="round" />
        </g>
      )}

      {/* 4. 끼임 / 협착 */}
      {category === 'caught' && (
        <g>
          <circle cx="31" cy="51" r="9.5" stroke="#18181B" strokeWidth="3.5" />
          <circle cx="31" cy="51" r="2.8" fill="#18181B" />
          <circle cx="49" cy="51" r="9.5" stroke="#18181B" strokeWidth="3.5" />
          <circle cx="49" cy="51" r="2.8" fill="#18181B" />
          <path
            d="M40 27V44M40 44L36.5 40M40 44L43.5 40"
            stroke="#B91C1C"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <rect x="37" y="47" width="6" height="8" rx="1" fill="#18181B" />
        </g>
      )}

      {/* 5. 부딪힘 / 충돌 */}
      {category === 'collision' && (
        <g>
          <rect x="20" y="48" width="18" height="10" rx="1.5" fill="#18181B" />
          <path
            d="M24 48V38H34L36 48"
            stroke="#18181B"
            strokeWidth="2.8"
            strokeLinejoin="round"
          />
          <path d="M39 40V58H46" stroke="#18181B" strokeWidth="2.8" strokeLinecap="round" />
          <circle cx="24" cy="60" r="3" fill="#18181B" />
          <circle cx="35" cy="60" r="3" fill="#18181B" />
          <circle cx="55" cy="40" r="3.4" fill="#18181B" />
          <path
            d="M55 44V54M55 47L49 51M55 54L51 61M55 54L59 61"
            stroke="#18181B"
            strokeWidth="2.8"
            strokeLinecap="round"
          />
          <path
            d="M44 43L47 46M44 49L48 48"
            stroke="#B91C1C"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
        </g>
      )}

      {/* 6. 붕괴 · 무너짐 */}
      {category === 'collapse' && (
        <g>
          <path d="M19 61H32V37H25L19 61Z" fill="#18181B" />
          <rect x="35" y="38" width="7" height="7" transform="rotate(18 35 38)" fill="#B91C1C" />
          <rect x="43" y="45" width="7" height="7" transform="rotate(-14 43 45)" fill="#18181B" />
          <rect x="36" y="51" width="8" height="7" transform="rotate(10 36 51)" fill="#18181B" />
          <circle cx="55" cy="48" r="3.2" fill="#18181B" />
          <path
            d="M55 52V60M55 54L49 52"
            stroke="#18181B"
            strokeWidth="2.8"
            strokeLinecap="round"
          />
        </g>
      )}

      {/* 7. 화재 · 폭발 */}
      {category === 'fire_explosion' && (
        <g>
          <path
            d="M41 24C41 24 52 34 52 46C52 53.5 46.8 60 40 60C33.2 60 28 53.5 28 46C28 41 31 36.5 34 34C34 38 36 40 38 40C37 33 41 24 41 24Z"
            fill="#18181B"
          />
          <path
            d="M40.5 43C40.5 43 45.5 47.5 45.5 52C45.5 55.2 43 57.5 40 57.5C37 57.5 34.5 55.2 34.5 52C34.5 49 36.5 46.5 38 45.5C38 47.5 39 48.5 40 48.5C39.8 46 40.5 43 40.5 43Z"
            fill="#DC2626"
          />
          <path d="M24 62H56" stroke="#18181B" strokeWidth="2.8" strokeLinecap="round" />
        </g>
      )}

      {/* 8. 감전 */}
      {category === 'electric_shock' && (
        <g>
          <path
            d="M45 23L29 45H40L34 62L52 40H41L45 23Z"
            fill="#18181B"
            stroke="#18181B"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
        </g>
      )}

      {/* 9. 질식 · 중독 */}
      {category === 'suffocation' && (
        <g>
          <path
            d="M27 61V43C27 39 33 36 40 36C47 36 53 39 53 43V61H27Z"
            stroke="#18181B"
            strokeWidth="3"
            fill="none"
          />
          <path
            d="M34 33C34 29 37 29 37 25M40 32C40 28 43 28 43 24M46 33C46 29 49 29 49 25"
            stroke="#B91C1C"
            strokeWidth="2.4"
            strokeLinecap="round"
          />
          <circle cx="40" cy="46" r="3.2" fill="#18181B" />
          <path
            d="M34 56C35.5 52 37.5 50.5 40 50.5C42.5 50.5 44.5 52 46 56"
            stroke="#18181B"
            strokeWidth="3"
            strokeLinecap="round"
          />
        </g>
      )}

      {/* Fallback: 일반 안전경고 (!) */}
      {category === 'general' && (
        <g>
          <rect x="37" y="27" width="6" height="22" rx="2.5" fill="#18181B" />
          <circle cx="40" cy="56.5" r="3.6" fill="#18181B" />
        </g>
      )}
    </svg>
  );
};

interface MechanismFlowProps {
  timeline: [TimelineStep, TimelineStep, TimelineStep, TimelineStep];
  theme: SafetyThemeConfig;
  compact?: boolean;
  inkSaver?: boolean;
  accentHex?: string;
}

function formatTimelineBadge(step: string, label: string): string {
  const s = (step || '').trim();
  const l = (label || '').trim();
  if (!l) return s;
  if (!s) return l;

  const normS = s.replace(/[\s·.\-:]/g, '');
  const normL = l.replace(/[\s·.\-:]/g, '');
  if (normS === normL || normS.includes(normL)) return s;
  if (normL.includes(normS)) return l;
  return `${s} · ${l}`;
}

export const AccidentMechanismDiagram: React.FC<MechanismFlowProps> = ({
  timeline,
  theme,
  compact = false,
  inkSaver = false,
  accentHex,
}) => {
  const arrowColor = inkSaver ? '#0F172A' : accentHex || theme.primaryHex;

  return (
    <div className="w-full keep-all">
      <div className="grid grid-cols-4 gap-2 items-stretch">
        {timeline.map((stage, idx) => {
          const isFinal = idx === timeline.length - 1;
          const badgeTitle = formatTimelineBadge(stage.step, stage.label);
          const detailLen = (stage.detail || '').length;
          const textClass = compact
            ? detailLen > 55
              ? 'text-[9.4px]'
              : 'text-[10px]'
            : detailLen > 55
              ? 'text-[10px]'
              : 'text-[10.6px]';

          return (
            <div key={`${stage.step}-${idx}`} className="relative flex items-stretch">
              <div
                className={`flex-1 flex flex-col justify-start rounded-md border ${
                  compact ? 'p-1.5' : 'p-2'
                }`}
                style={{
                  backgroundColor: inkSaver
                    ? '#FFFFFF'
                    : isFinal
                      ? '#ECFDF5'
                      : '#F8FAFC',
                  borderColor: inkSaver
                    ? isFinal
                      ? '#0F172A'
                      : '#64748B'
                    : isFinal
                      ? '#059669'
                      : '#CBD5E1',
                  borderWidth: inkSaver && isFinal ? '1.5px' : '1px',
                }}
              >
                <div className="flex items-center justify-between gap-1 mb-1">
                  <span
                    className={`font-bold px-1.5 py-0.5 rounded-sm leading-tight ${
                      compact ? 'text-[9.5px]' : 'text-[10.2px]'
                    }`}
                    style={
                      inkSaver
                        ? {
                            backgroundColor: isFinal ? '#E2E8F0' : '#F1F5F9',
                            color: '#0F172A',
                            border: '1px solid #334155',
                          }
                        : {
                            backgroundColor: isFinal ? '#047857' : '#1E293B',
                            color: '#FFFFFF',
                          }
                    }
                  >
                    {badgeTitle}
                  </span>
                  {idx < timeline.length - 1 && (
                    <svg
                      width="12"
                      height="10"
                      viewBox="0 0 14 12"
                      fill="none"
                      className="shrink-0"
                      aria-hidden="true"
                    >
                      <path
                        d="M1 6H12M12 6L8 2M12 6L8 10"
                        stroke={arrowColor}
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                  {isFinal && (
                    <span
                      className={`text-[9px] font-extrabold leading-none shrink-0 whitespace-nowrap ${
                        inkSaver ? 'text-slate-900' : 'text-emerald-800'
                      }`}
                    >
                      예방 핵심
                    </span>
                  )}
                </div>

                <p className={`text-slate-900 font-medium leading-snug keep-all ${textClass}`}>
                  {stage.detail}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
