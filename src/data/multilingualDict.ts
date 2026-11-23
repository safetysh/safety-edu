import { AccidentCase, ForeignLanguageCode, HazardType, SeasonRiskId } from '../types/safety';

export type ActiveForeignLang = Exclude<ForeignLanguageCode, 'none'>;

export interface ForeignLanguageOption {
  code: ForeignLanguageCode;
  label: string;
  nativeLabel: string;
}

export const FOREIGN_LANGUAGE_OPTIONS: ForeignLanguageOption[] = [
  { code: 'none', label: '병기 안 함 (한국어 단독)', nativeLabel: '한국어' },
  { code: 'en', label: '영어 병기 (English)', nativeLabel: 'English' },
  { code: 'vi', label: '베트남어 병기 (Tiếng Việt)', nativeLabel: 'Tiếng Việt' },
  { code: 'zh', label: '중국어 병기 (中文)', nativeLabel: '中文' },
  { code: 'th', label: '태국어 병기 (ภาษาไทย)', nativeLabel: 'ภาษาไทย' },
  { code: 'km', label: '캄보디아어 병기 (ភាសាខ្មែរ)', nativeLabel: 'ភាសាខ្មែរ' },
  { code: 'uz', label: '우즈베크어 병기 (Oʻzbekcha)', nativeLabel: 'Oʻzbekcha' },
];

export interface CaseTranslationPack {
  slogan: string;
  measures: [string, string, string, string];
}

/**
 * 100% offline static multilingual safety dictionary (Zero Translation API).
 * Provides authentic worker safety slogans & 4 key preventive measures per built-in case,
 * plus hazard-level fallbacks so newly uploaded custom JSON cases also render bilingual text immediately.
 */
const CASE_TRANSLATIONS: Record<string, Record<ActiveForeignLang, CaseTranslationPack>> = {
  'CON-001': {
    en: {
      slogan: 'Lock wheels! Check guardrails! Always climb down before moving!',
      measures: [
        'Climb down completely before moving scaffold; lock all 4 wheel brakes before work.',
        'Keep guardrails (90-120cm) and toe-boards installed on all 4 sides.',
        'Deploy outriggers firmly on level ground for scaffolds 2m or higher.',
        'Fasten helmet chinstrap and harness hook; verify in pairs before ascending.',
      ],
    },
    vi: {
      slogan: 'Khóa bánh xe! Kiểm tra lan can! Luôn xuống dưới trước khi di chuyển giàn giáo!',
      measures: [
        'Phải xuống khỏi giàn giáo trước khi di chuyển và khóa chặt cả 4 phanh bánh xe.',
        'Luôn lắp đầy đủ lan can an toàn 4 phía và tấm chắn chân.',
        'Mở rộng chân chống lật (outrigger) cố định chắc chắn khi làm việc từ 2m trở lên.',
        'Cài quai mũ bảo hộ và móc dây an toàn; kiểm tra chéo theo nhóm 2 người.',
      ],
    },
    zh: {
      slogan: '锁紧脚轮！检查护栏！移动脚手架前必须先下来！',
      measures: [
        '移动脚手架前作业人员必须全部下架，作业前锁死全部4个轮刹。',
        '作业平台四面必须全程保持安装安全护栏及踢脚板。',
        '脚手架高度2米及以上时，必须展开防倾倒支撑架并确认水平。',
        '高空作业系紧安全帽下颌带与安全带，落实两人互检。',
      ],
    },
    th: {
      slogan: 'ล็อกล้อให้แน่น! ตรวจราวกันตก! ลงจากนั่งร้านทุกครั้งก่อนเคลื่อนย้าย!',
      measures: [
        'ลงจากนั่งร้านก่อนเคลื่อนย้ายทุกครั้ง และล็อกเบรกล้อทั้ง 4 ล้อให้แน่นก่อนทำงาน',
        'ติดตั้งราวกันตกทั้ง 4 ด้านและแผ่นกันของตกให้ครบถ้วนเสมอ',
        'กางขาค้ำยันกันล้ม (Outrigger) ให้แนบพื้นเสมอกันเมื่อสูงตั้งแต่ 2 เมตรขึ้นไป',
        'รัดสายรัดคางหมวกนิรภัยและเกี่ยวเข็มขัดนิรภัย ตรวจเช็กคู่กัน 2 คน',
      ],
    },
    km: {
      slogan: 'ចាក់សោកង់! ពិនិត្យបង្កាន់ដៃ! ត្រូវចុះពីរន្ទាមុនពេលរំកិលជានិច្ច!',
      measures: [
        'ត្រូវចុះពីរន្ទាជាមុនសិនមុននឹងរំកិល ហើយចាក់សោហ្វ្រាំងកង់ទាំង ៤ មុនធ្វើការ។',
        'ត្រូវដំឡើងបង្កាន់ដៃសុវត្ថិភាពទាំង ៤ ជ្រុង និងក្តារទប់ជើងជានិច្ច។',
        'ត្រូវពង្រីកជើងទ្រការពារដួលឲ្យជាប់នឹងដីសម្រាប់រន្ទាខ្ពស់ចាប់ពី ២ម៉ែត្រឡើង។',
        'ពាក់មួកសុវត្ថិភាពរឹតខ្សែចង្កា និងខ្សែក្រវាត់សុវត្ថិភាពដោយពិនិត្យគ្នា ២នាក់។',
      ],
    },
    uz: {
      slogan: 'G‘ildiraklarni qulflang! To‘siqni tekshiring! Siljitishdan oldin pastga tushing!',
      measures: [
        'Havozani siljitishdan oldin albatta pastga tushing va ishdan oldin 4 g‘ildirak tormozini qulflang.',
        'Ish maydonchasining 4 tomonida xavfsizlik to‘siqlari va oyoq taxtalarini to‘liq o‘rnating.',
        '2 metrdan baland havozalarda ag‘darilishga qarshi tayanchlarni yerga mahkamlang.',
        'Kaska bog‘ichini taqing, himoya kamarini ulang va 2 kishi o‘zaro tekshiring.',
      ],
    },
  },
  'CON-002': {
    en: {
      slogan: 'No entry into unshored trenches! Check slope cracks after rain first!',
      measures: [
        'Install shoring/trench boxes or keep safe slope angle for excavations over 1.5m.',
        'Keep excavated soil, materials, and heavy equipment well away from trench edges.',
        'Inspect slopes for cracks, loose soil, or groundwater right after rain or vibration.',
        'Place escape ladders inside trenches and assign a dedicated top spotter.',
      ],
    },
    vi: {
      slogan: 'Cấm vào hố đào không có chống vách! Kiểm tra vết nứt đất sau mưa trước!',
      measures: [
        'Hố đào sâu từ 1,5m trở lên phải lắp khung chống sạt lở hoặc tạo độ dốc an toàn.',
        'Để đất đào, vật liệu và máy móc cách xa mép hố đào theo khoảng cách an toàn.',
        'Sau mưa hoặc rung chấn, quản lý phải kiểm tra vết nứt, rò nước trước khi làm.',
        'Đặt thang thoát hiểm trong hố đào và bố trí người cảnh giới phía trên.',
      ],
    },
    zh: {
      slogan: '无支护严禁下坑！雨后先查边坡裂缝与渗水！',
      measures: [
        '开挖深度1.5米以上必须先装挡土支护或按规范放坡。',
        '弃土、材料及重型机械必须远离坑边安全距离堆放与停靠。',
        '雨后或振动作业后，主管必须先排查边坡裂缝、松土与渗水。',
        '基坑内设置逃生爬梯并安排坑上专职监护人员。',
      ],
    },
    th: {
      slogan: 'ห้ามลงบ่อขุดที่ไม่มีค้ำยัน! ตรวจรอยร้าวดินหลังฝนตกก่อนทำงาน!',
      measures: [
        'ขุดลึกเกิน 1.5 ม. ต้องติดตั้งค้ำยันกันดินพังหรือทำลาดเอียงตามมาตรฐานก่อนลง',
        'กองดิน วัสดุ และเครื่องจักรหนักให้ห่างจากขอบบ่อขุดในระยะปลอดภัย',
        'หลังฝนตกหรือมีแรงสั่นสะเทือน ต้องตรวจรอยแตกและน้ำซึมที่ผนังดินก่อนเสมอ',
        'ติดตั้งบันไดหนีภัยในบ่อขุดและจัดผู้เฝ้าระวังด้านบนตลอดเวลา',
      ],
    },
    km: {
      slogan: 'ហាមចូលរណ្តៅជីកគ្មានទម្រការពារ! ពិនិត្យស្នាមប្រេះដីក្រោយភ្លៀងជាមុន!',
      measures: [
        'រណ្តៅជម្រៅលើស ១.៥ម ត្រូវដំឡើងទម្រទប់ដី ឬជីកជម្រាលសុវត្ថិភាពជាមុន។',
        'ត្រូវទុកដីជីក សម្ភារៈ និងគ្រឿងចក្រឲ្យឆ្ងាយពីមាត់រណ្តៅជីក។',
        'ក្រោយភ្លៀង ត្រូវពិនិត្យស្នាមប្រេះ និងទឹកជ្រាបលើជញ្ជាំងដីមុនចូលធ្វើការ។',
        'ដាក់ជណ្តើរសម្រាប់គេចខ្លួនក្នុងរណ្តៅ និងមានអ្នកឃ្លាំមើលនៅខាងលើ។',
      ],
    },
    uz: {
      slogan: 'Mustahkamlanmagan chuqurga kirmang! Yomg‘irdan keyin yoriqlarni tekshiring!',
      measures: [
        '1,5 m dan chuqur qazishda tayanch qalqon o‘rnating yoki xavfsiz qiyalik qiling.',
        'Qazilgan tuproq, material va og‘ir texnikani chuqur chetidan uzoqroqda saqlang.',
        'Yomg‘ir va tebranishdan so‘ng devorlardagi yoriq va suv sizishini tekshiring.',
        'Chuqur ichiga chiqish narvoni qo‘ying va tepada doimiy kuzatuvchi tayinlang.',
      ],
    },
  },
  'CON-003': {
    en: {
      slogan: 'Never step on skylights! No roof entry without covers, walkways & harness!',
      measures: [
        'Install sturdy covers or dedicated safety nets over all skylights before entry.',
        'Lay non-slip walkways at least 30cm wide and walk strictly on the boards.',
        'Install under-roof fall nets or horizontal lifelines and stay clipped in at all times.',
        'Place edge guardrails or warning markers and always work in pairs.',
      ],
    },
    vi: {
      slogan: 'Tuyệt đối không giẫm lên tấm lấy sáng! Không có nắp che, ván đi và dây an toàn thì cấm lên mái!',
      measures: [
        'Lắp nắp che chắc chắn hoặc lưới chống rơi trên tất cả tấm lấy sáng trước khi lên mái.',
        'Lắp ván đi chống trượt rộng tối thiểu 30cm và chỉ di chuyển trên ván.',
        'Lắp lưới chống rơi dưới mái hoặc dây cứu sinh ngang và móc dây an toàn liên tục.',
        'Lắp lan can mép mái, biển cảnh báo và làm việc theo nhóm 2 người.',
      ],
    },
    zh: {
      slogan: '严禁踩踏采光瓦！无盖板、走道板、安全带禁止上屋面！',
      measures: [
        '上屋面前须在所有采光窗上方铺设坚固盖板或专用防坠网。',
        '屋面通行路径铺设宽度30cm以上防滑走道板，严禁板外行走。',
        '屋面下方张挂安全平网，或架设水平生命绳全程系挂安全带。',
        '屋面临边设置护栏或警示标识，严格执行两人结伴作业。',
      ],
    },
    th: {
      slogan: 'ห้ามเหยียบแผ่นโปร่งแสงเด็ดขาด! ไม่มีฝาครอบ ทางเดิน และเข็มขัดนิรภัย ห้ามขึ้นหลังคา!',
      measures: [
        'ติดตั้งฝาครอบแข็งแรงหรือตาข่ายกันตกคลุมแผ่นโปร่งแสงทุกจุดก่อนขึ้นหลังคา',
        'วางแผ่นทางเดินกันลื่นกว้างอย่างน้อย 30 ซม. และเดินบนแผ่นทางเดินเท่านั้น',
        'ขึงตาข่ายกันตกใต้หลังคา หรือติดตั้งเชือกนิรภัยแนวนอนและเกี่ยวเข็มขัดตลอดเวลา',
        'ติดตั้งราวกันตกขอบหลังคาและทำงานเป็นคู่ 2 คนเสมอ',
      ],
    },
    km: {
      slogan: 'ហាមជាន់លើដំបូលពន្លឺជាដាច់ខាត! គ្មានគម្រប ក្តារដើរ និងខ្សែក្រវាត់ ហាមឡើងដំបូល!',
      measures: [
        'ត្រូវដាក់គម្របរឹងមាំ ឬសំណាញ់ការពារធ្លាក់លើដំបូលពន្លឺទាំងអស់ជាមុន។',
        'ត្រូវក្រាលក្តារដើរទទឹងយ៉ាងតិច ៣០ស.ម ហើយដើរតែលើក្តារប៉ុណ្ណោះ។',
        'ដាក់សំណាញ់ការពារក្រោមដំបូល ឬខ្សែជួយជីវិត និងពាក់ខ្សែក្រវាត់សុវត្ថិភាពជានិច្ច។',
        'ដាក់បង្កាន់ដៃគែមដំបូល និងធ្វើការជាគូ ២នាក់ជានិច្ច។',
      ],
    },
    uz: {
      slogan: 'Yorug‘lik oynasini aslo bosmang! Qopqoq, yo‘lak va kamarsiz tomga chiqmang!',
      measures: [
        'Tomga chiqishdan oldin barcha yorug‘lik oynalariga mustahkam qopqoq yoki to‘r o‘rnating.',
        'Kamida 30 sm kenglikdagi sirpanmaydigan yurish taxtalarini qo‘ying va faqat ulardan yuring.',
        'Tom ostiga himoya to‘ri yoki gorizontal arqon torting va kamarni doim ulang.',
        'Tom chetiga to‘siq qo‘ying va ishni albatta 2 kishi bo‘lib bajaring.',
      ],
    },
  },
  'CON-004': {
    en: {
      slogan: 'No entry without gas test! Ventilation, spotter & air-line mask save lives!',
      measures: [
        'Replace charcoal heaters with electric heaters whenever possible to prevent CO gas.',
        'Measure and record O2 (18-23.5%) and CO (<30ppm) before and during entry.',
        'Continuously ventilate with blowers; wear supplied-air respirators if air is unsafe.',
        'Post no-entry signs, station an outside spotter with radio & rescue gear.',
      ],
    },
    vi: {
      slogan: 'Không đo khí tuyệt đối không vào! Thông gió, người canh và mặt nạ cấp khí cứu mạng bạn!',
      measures: [
        'Thay thế bếp than bằng máy sưởi điện để tránh phát sinh khí độc CO.',
        'Đo nồng độ oxy (18~23,5%) và khí CO (<30ppm) trước và trong khi vào không gian kín.',
        'Thông gió cưỡng bức liên tục; đeo mặt nạ cấp khí nếu không khí chưa đạt chuẩn.',
        'Gắn biển cấm vào, bố trí người cảnh giới bên ngoài cùng bộ đàm và thiết bị cứu hộ.',
      ],
    },
    zh: {
      slogan: '不测气体严禁进入！通风、监护、送气面罩守护生命！',
      measures: [
        '尽量以电热风机替代炭炉养护，从源头杜绝一氧化碳产生。',
        '进出前后必须使用复合气体检测仪测量并记录氧气及CO浓度。',
        '持续机械强制通风，空气未达标时必须佩戴送风式呼吸器结伴作业。',
        '入口悬挂禁止入内标识，外部专人监护并备齐对讲机与救援装备。',
      ],
    },
    th: {
      slogan: 'ไม่ตรวจวัดก๊าซ ห้ามเข้าเด็ดขาด! ระบายอากาศ ผู้เฝ้าระวัง และหน้ากากส่งอากาศช่วยชีวิต!',
      measures: [
        'หลีกเลี่ยงเตาถ่านและเปลี่ยนเป็นเครื่องเป่าลมร้อนไฟฟ้าเพื่อป้องกันก๊าซ CO',
        'ตรวจวัดและบันทึกค่าออกซิเจน (18-23.5%) และก๊าซ CO (<30ppm) ก่อนและระหว่างเข้าทำงาน',
        'เปิดพัดลมระบายอากาศตลอดเวลา และสวมหน้ากากส่งอากาศหากอากาศยังไม่ปลอดภัย',
        'ติดป้ายห้ามเข้า จัดผู้เฝ้าระวังด้านนอกพร้อมวิทยุสื่อสารและอุปกรณ์กู้ภัย',
      ],
    },
    km: {
      slogan: 'គ្មានការវាស់ឧស្ម័ន ហាមចូលជាដាច់ខាត! បញ្ចេញខ្យល់ អ្នកយាម និងម៉ាសខ្យល់ជួយជីវិត!',
      measures: [
        'ជៀសវាងការប្រើធ្យូងដុត ហើយប្តូរទៅម៉ាស៊ីនកំដៅអគ្គិសនីដើម្បីការពារឧស្ម័ន CO។',
        'វាស់កម្រិតអុកស៊ីសែន (18-23.5%) និង CO (<30ppm) មុន និងពេលកំពុងចូល។',
        'បើកកង្ហារបញ្ចេញខ្យល់ជានិច្ច និងពាក់ម៉ាសផ្គត់ផ្គង់ខ្យល់បើខ្យល់មិនទាន់សុវត្ថិភាព។',
        'ដាក់ស្លាកហាមចូល មានអ្នកឃ្លាំមើលខាងក្រៅ វិទ្យុទាក់ទង និងឧបករណ៍សង្គ្រោះ។',
      ],
    },
    uz: {
      slogan: 'Gazni o‘lchamasdan kirmang! Shamollatish, kuzatuvchi va havo niqobi hayotni saqlaydi!',
      measures: [
        'Is gazi (CO) chiqmasligi uchun ko‘mir pechi o‘rniga elektr isitkichdan foydalaning.',
        'Kirishdan oldin va ish vaqtida kislorod (18-23,5%) va CO (<30ppm) miqdorini o‘lchang.',
        'Majburiy shamollatishni yoqing; havo xavfsiz bo‘lmasa havo beruvchi niqob taqing.',
        'Kirish joyiga taqiq belgisini iling, tashqarida kuzatuvchi va qutqaruv jihozini tayyorlang.',
      ],
    },
  },
  'MFG-001': {
    en: {
      slogan: 'Never touch a running machine! Power OFF & LOTO is your lifeline!',
      measures: [
        'Shut off main power and apply personal Lock & Tag (LOTO) before cleaning or repair.',
        'Keep full guards with safety interlocks over all pulley and roller pinch points.',
        'Install and test emergency pull-cord stop switches along the entire conveyor.',
        'Avoid loose sleeves and cotton gloves near rotating parts; never clean while running.',
      ],
    },
    vi: {
      slogan: 'Máy chưa dừng tuyệt đối không chạm tay! Ngắt nguồn và khóa LOTO là dây cứu sinh!',
      measures: [
        'Ngắt nguồn điện chính, khóa cá nhân (LOTO) và treo biển báo trước khi vệ sinh, sửa chữa.',
        'Lắp nắp che kín có công tắc liên động tại mọi điểm kẹp của puly và con lăn.',
        'Lắp đặt và kiểm tra dây kéo dừng khẩn cấp dọc theo toàn bộ băng tải.',
        'Không mặc áo rộng hay đeo găng tay vải gần bộ phận quay; cấm vệ sinh khi máy đang chạy.',
      ],
    },
    zh: {
      slogan: '设备未停严禁伸手！断电上锁挂牌(LOTO)是保命线！',
      measures: [
        '清扫、检修、除异物前必须切断主电源并执行个人上锁挂牌(LOTO)。',
        '皮带轮与滚筒咬合点全面安装密闭防护罩及开盖即停联锁装置。',
        '输送机全线配备并定期点检拉绳式急停开关。',
        '严禁戴线手套或穿宽松袖口靠近旋转部位，严禁运转中清扫。',
      ],
    },
    th: {
      slogan: 'เครื่องไม่หยุด ห้ามเอามือแตะเด็ดขาด! ตัดไฟและล็อกกุญแจ (LOTO) คือสายช่วยชีวิต!',
      measures: [
        'ตัดไฟหลัก ล็อกกุญแจส่วนตัว (LOTO) และติดป้ายเตือนก่อนทำความสะอาดหรือซ่อมบำรุง',
        'ติดตั้งฝาครอบนิรภัยพร้อมสวิตช์อินเตอร์ล็อกปิดจุดหนีบของลูกกลิ้งและพูลเลย์ทั้งหมด',
        'ติดตั้งและทดสอบสายดึงหยุดฉุกเฉินตลอดแนวสายพานลำเลียง',
        'ห้ามสวมถุงมือผ้าหรือเสื้อหลวมใกล้จุดหมุน และห้ามทำความสะอาดขณะเครื่องทำงาน',
      ],
    },
    km: {
      slogan: 'ម៉ាស៊ីនមិនឈប់ ហាមប៉ះជាដាច់ខាត! ផ្តាច់ភ្លើង និងចាក់សោ (LOTO) គឺជាខ្សែជីវិត!',
      measures: [
        'ផ្តាច់ភ្លើងមេ ចាក់សោផ្ទាល់ខ្លួន (LOTO) និងព្យួរស្លាកព្រមានមុនសម្អាត ឬជួសជុល។',
        'ដំឡើងគម្របការពារជិត និងប្រព័ន្ធឈប់ស្វ័យប្រវត្តិលើចំណុចកៀបទាំងអស់។',
        'ដំឡើង និងពិនិត្យខ្សែទាញបញ្ឈប់បន្ទាន់តាមបណ្តោយខ្សែពានទាំងមូល។',
        'ហាមពាក់ស្រោមដៃក្រណាត់ ឬអាវរលុងជិតផ្នែកវិល និងហាមសម្អាតពេលម៉ាស៊ីនកំពុងដើរ។',
      ],
    },
    uz: {
      slogan: 'To‘xtamagan mashinaga tegmang! Elektrni o‘chirish va LOTO qulfi hayotingiz garovidir!',
      measures: [
        'Tozalash va ta’mirlashdan oldin asosiy elektrni o‘chiring hamda shaxsiy qulf (LOTO) osing.',
        'Barcha rolik va shkiv qisilish nuqtalariga blokirovkali himoya qopqog‘i o‘rnating.',
        'Konveyer bo‘ylab favqulodda to‘xtatish troslarini o‘rnating va sinab turing.',
        'Aylanuvchi qismlar yonida keng yeng va ip qo‘lqop kiymang; ishlab turganda tozalamang.',
      ],
    },
  },
  'MFG-002': {
    en: {
      slogan: 'Pedestrians stay in walkways! Forklifts stop & check before reversing!',
      measures: [
        'Physically separate pedestrian lanes and prohibit walking inside forklift zones.',
        'Inspect backup alarms, BlueSpot warning lights, and rear cameras daily.',
        'Make a full stop and sound the horn at intersections; use a signaler in blind spots.',
        'Wear seatbelts at all times, obey speed limits, and keep forks 15-20cm off the floor.',
      ],
    },
    vi: {
      slogan: 'Người đi bộ đi đúng làn! Xe nâng dừng hẳn và quan sát kỹ trước khi lùi!',
      measures: [
        'Phân tách rõ lối đi bộ bằng rào chắn/vạch sơn; cấm đi vào khu vực xe nâng hoạt động.',
        'Kiểm tra hàng ngày còi lùi, đèn cảnh báo BlueSpot và camera lùi.',
        'Dừng hẳn và bấm còi tại ngã tư; bố trí người dẫn đường ở khu vực khuất tầm nhìn.',
        'Luôn thắt dây an toàn, tuân thủ tốc độ giới hạn và giữ càng nâng cách đất 15~20cm.',
      ],
    },
    zh: {
      slogan: '行人走专道！叉车倒车先停稳确认！',
      measures: [
        '用护栏或划线明确区分人行通道，严禁行人进入叉车作业区。',
        '每日点检倒车蜂鸣器、蓝光警示灯(BlueSpot)及倒车影像是否正常。',
        '交叉路口必须一停二鸣笛三通过，视线受阻时安排专职引导员。',
        '驾驶全程系好安全带、严守限速，行驶时货叉保持离地15~20cm。',
      ],
    },
    th: {
      slogan: 'คนเดินในทางเดินเท้า! รถโฟล์คลิฟท์หยุดและตรวจให้แน่ใจก่อนถอยหลัง!',
      measures: [
        'แยกทางเดินเท้ากับทางรถโฟล์คลิฟท์ให้ชัดเจน ห้ามคนเดินเข้าเขตทำงานของรถ',
        'ตรวจเสียงเตือนถอยหลัง ไฟเตือน BlueSpot และกล้องมองหลังทุกวันก่อนใช้งาน',
        'หยุดรถและบีบแตรทุกทางแยก และจัดคนให้สัญญาณในจุดอับสายตา',
        'คาดเข็มขัดนิรภัยทุกครั้ง จำกัดความเร็ว และยกงาสูงจากพื้น 15-20 ซม. ขณะขับ',
      ],
    },
    km: {
      slogan: 'អ្នកដើរត្រូវដើរតាមផ្លូវថ្មើរជើង! រថយន្តលើកទំនិញត្រូវឈប់ និងពិនិត្យមុនថយក្រោយ!',
      measures: [
        'បែងចែកផ្លូវថ្មើរជើងឲ្យច្បាស់ និងហាមដើរចូលតំបន់រថយន្តលើកទំនិញធ្វើការ។',
        'ពិនិត្យសំឡេងរោទ៍ថយក្រោយ ភ្លើងព្រមាន BlueSpot និងកាមេរ៉ាជារៀងរាល់ថ្ងៃ។',
        'ឈប់ និងស៊ីផ្លេនៅផ្លូវប្រសព្វ ព្រមទាំងមានអ្នកផ្តល់សញ្ញានៅកន្លែងងងឹតភ្នែក។',
        'ពាក់ខ្សែក្រវាត់សុវត្ថិភាព គោរពល្បឿនកំណត់ និងរក្សាជើងលើកខ្ពស់ពីដី 15-20ស.ម។',
      ],
    },
    uz: {
      slogan: 'Piyodalar faqat yo‘lakdan yursin! Yuk ko‘targich orqaga yurishdan oldin to‘xtab tekshirsin!',
      measures: [
        'Piyodalar yo‘lagini aniq ajrating va yuk ko‘targich hududiga kirishni taqiqlang.',
        'Orqaga yurish signali, BlueSpot chirog‘i va orqa kamerani har kuni tekshiring.',
        'Chorrahada to‘liq to‘xtab signal bering; ko‘rinmaydigan joyda yo‘l ko‘rsatuvchi qo‘ying.',
        'Xavfsizlik kamarini taqing, tezlikka rioya qiling va vilkani yerdan 15-20 sm baland tuting.',
      ],
    },
  },
  'MFG-003': {
    en: {
      slogan: 'Both feet on the deck! Clip harness to anchor! Never stand on guardrails!',
      measures: [
        'Never climb onto guardrails or place ladders/boxes inside the aerial lift basket.',
        'Attach safety harness to the dedicated basket anchor and fasten helmet chinstrap.',
        'Inspect anti-entrapment limit bars, emergency lowering, and tilt alarms daily.',
        'If blocked below, stop work and switch to an articulating boom lift instead of reaching out.',
      ],
    },
    vi: {
      slogan: 'Hai chân đứng vững trên sàn! Móc dây an toàn vào móc chuyên dụng! Cấm trèo lên lan can!',
      measures: [
        'Tuyệt đối không giẫm lên lan can hoặc đặt thêm thang, bục lên sàn xe nâng người.',
        'Móc dây an toàn vào điểm neo trong giỏ và cài chặt quai mũ bảo hộ ngay khi lên.',
        'Kiểm tra hàng ngày thanh chống kẹp trần, van hạ khẩn cấp và còi báo nghiêng.',
        'Khi bị vướng phía dưới, không với người mà chuyển sang xe nâng cần gập phù hợp.',
      ],
    },
    zh: {
      slogan: '双脚站稳底板！安全带挂专用环！严禁踩踏护栏！',
      measures: [
        '高空作业车内严禁踩踏护栏或在平台内垫放梯子、垫块作业。',
        '登车即刻将安全带系挂在平台专用挂点，并系紧安全帽下颌带。',
        '每日点检防过升挤压装置、紧急下降阀及倾斜报警功能。',
        '下部设备阻碍无法靠近时，严禁探身作业，应更换曲臂式作业车。',
      ],
    },
    th: {
      slogan: 'ยืนสองเท้าบนพื้นกระเช้า! เกี่ยวเข็มขัดกับจุดยึด! ห้ามเหยียบราวกันตกเด็ดขาด!',
      measures: [
        'ห้ามเหยียบราวกันตกหรือวางบันไดเสริมบนกระเช้ารถกระเช้าไฟฟ้าโดยเด็ดขาด',
        'เกี่ยวเข็มขัดนิรภัยเข้ากับจุดยึดภายในกระเช้าและรัดสายรัดคางหมวกนิรภัยทันที',
        'ตรวจเช็กอุปกรณ์กันหนีบด้านบน ระบบลดระดับฉุกเฉิน และสัญญาณเตือนเอียงทุกวัน',
        'หากเข้าไม่ถึงจุดซ่อม ห้ามเอื้อมตัวออกนอกราว ให้เปลี่ยนใช้รถกระเช้าแบบบูมพับ',
      ],
    },
    km: {
      slogan: 'ឈរជើងទាំងពីរលើកម្រាល! ភ្ជាប់ខ្សែក្រវាត់នឹងកង! ហាមជាន់លើបង្កាន់ដៃជាដាច់ខាត!',
      measures: [
        'ហាមជាន់លើបង្កាន់ដៃ ឬដាក់ជណ្តើរបន្ថែមលើកម្រាលរថយន្តលើកមនុស្សជាដាច់ខាត។',
        'ភ្ជាប់ខ្សែក្រវាត់សុវត្ថិភាពទៅកងក្នុងកន្ត្រក និងរឹតខ្សែមួកសុវត្ថិភាពភ្លាម។',
        'ពិនិត្យឧបករណ៍ការពារកៀបលើ ប្រព័ន្ធបន្ទាបបន្ទាន់ និងសញ្ញាព្រមានផ្អៀងរាល់ថ្ងៃ។',
        'បើមិនដល់កន្លែងជួសជុល ហាមលូកខ្លួនចេញ ត្រូវប្តូរទៅរថយន្តលើកដៃបត់វិញ។',
      ],
    },
    uz: {
      slogan: 'Ikki oyoq polda tursin! Kamarni maxsus ilgakka ulang! To‘siqqa aslo chiqmang!',
      measures: [
        'Hech qachon platforma to‘sig‘iga chiqmang va ichiga narvon yoki quti qo‘ymang.',
        'Kamar ilgagini savat ichidagi maxsus halqaga ulang va kaska bog‘ichini mahkamlang.',
        'Haddan ziyod ko‘tarilishdan himoya, favqulodda tushirish va qiyalik signalini har kuni tekshiring.',
        'Pastda to‘siq bo‘lsa, cho‘zilib ishlamang — bukiluvchi strelali ko‘targichga almashtiring.',
      ],
    },
  },
  'SVC-001': {
    en: {
      slogan: 'Never stand on top ladder steps! Work in pairs, wear helmet & cut power first!',
      measures: [
        'Use ladders for access only; for light work up to 3.5m use outriggers and 2-person support.',
        'Never stand on the top step or the step directly below it; switch to a work platform.',
        'Switch OFF and lock the breaker, then verify zero voltage with a tester before work.',
        'Always wear a helmet with fastened chinstrap and clear slippery floors first.',
      ],
    },
    vi: {
      slogan: 'Cấm đứng bậc trên cùng của thang! Làm 2 người, đội mũ bảo hộ và ngắt điện trước!',
      measures: [
        'Ưu tiên dùng giàn làm việc; nếu bắt buộc dùng thang (≤3,5m) phải có chân chống và 2 người giữ.',
        'Tuyệt đối không đứng lên bậc trên cùng và bậc kế tiếp của thang chữ A.',
        'Ngắt aptomat tại tủ điện, khóa lại và dùng bút thử điện kiểm tra không còn điện.',
        'Luôn đội mũ bảo hộ cài quai và lau sạch sàn trơn trước khi đặt thang.',
      ],
    },
    zh: {
      slogan: '严禁站立人字梯顶层！两人配合、戴安全帽、先断电验电！',
      measures: [
        '作业优先选用移动工作台；确需使用梯子(≤3.5m)须加装防倒支腿并两人配合。',
        '严禁站立在人字梯最顶层及次顶层踏板上作业。',
        '更换灯具前必须断开配电箱断路器、上锁并用验电笔确认无电。',
        '即使2米以下也须系紧安全帽下颌带，并清除地面水渍防滑。',
      ],
    },
    th: {
      slogan: 'ห้ามเหยียบขั้นบนสุดของบันได! ทำคู่ 2 คน สวมหมวกนิรภัย และตัดไฟก่อนเสมอ!',
      measures: [
        'ใช้บันไดเพื่อขึ้นลงเท่านั้น หากจำเป็นต้องทำงานเบา (≤3.5 ม.) ต้องมีขาค้ำและคนจับด้านล่าง',
        'ห้ามยืนบนขั้นบนสุดและขั้นรองลงมาของบันไดทรง A ให้เปลี่ยนใช้นั่งร้านแทน',
        'ปิดและล็อกเบรกเกอร์ที่ตู้ไฟ พร้อมใช้ไขควงวัดไฟตรวจว่าไม่มีไฟก่อนทุกครั้ง',
        'สวมหมวกนิรภัยรัดสายคางและเช็ดพื้นลื่นให้แห้งก่อนตั้งบันได',
      ],
    },
    km: {
      slogan: 'ហាមឈរលើកាំខាងលើបំផុតនៃជណ្តើរ! ធ្វើការ ២នាក់ ពាក់មួកសុវត្ថិភាព និងផ្តាច់ភ្លើងមុន!',
      measures: [
        'ប្រើជណ្តើរសម្រាប់ឡើងចុះប៉ុណ្ណោះ បើចាំបាច់ត្រូវមានជើងទ្រ និងមនុស្ស ២នាក់ទប់ខាងក្រោម។',
        'ហាមឈរលើកាំលើបំផុត និងកាំទីពីរពីលើនៃជណ្តើរអក្សរ A ជាដាច់ខាត។',
        'ផ្តាច់ឌីសង់ទ័រនៅទូភ្លើង ចាក់សោ និងប្រើឧបករណ៍វាស់ភ្លើងបញ្ជាក់ថាគ្មានចរន្ត។',
        'ពាក់មួកសុវត្ថិភាពរឹតខ្សែចង្កា និងសម្អាតកម្រាលរអិលមុនដាក់ជណ្តើរ។',
      ],
    },
    uz: {
      slogan: 'Narvonning eng ustki pog‘onasiga chiqmang! 2 kishi ishlang, kaska kiying va tokni o‘chiring!',
      measures: [
        'Imkon qadar ish platformasidan foydalaning; narvonda (≤3,5 m) 2 kishi va tayanch bilan ishlang.',
        'A-shaklli narvonning eng yuqori va undan pastki pog‘onasiga aslo chiqmang.',
        'Chiroq almashtirishdan oldin avtomatni o‘chiring va indikator bilan tok yo‘qligini tekshiring.',
        'Kaska bog‘ichini taqing va sirpanchiq polni oldindan tozalang.',
      ],
    },
  },
  'SVC-002': {
    en: {
      slogan: 'Standby is NOT stopped! No hopper access without power OFF & LOTO!',
      measures: [
        'Shut off main power, apply LOTO lock, and release hydraulic pressure before clearing jams.',
        'Keep hopper door safety interlocks working at all times; never bypass sensors.',
        'Install guardrails & E-stops around hoppers; never put hands or feet inside.',
        'Use long dedicated hooks from outside the hazard zone and work in pairs.',
      ],
    },
    vi: {
      slogan: 'Chế độ chờ không phải là đã dừng! Cấm lại gần miệng nạp nếu chưa ngắt điện và khóa LOTO!',
      measures: [
        'Ngắt nguồn điện chính, khóa LOTO và xả áp thủy lực trước khi xử lý kẹt rác.',
        'Duy trì công tắc liên động cửa nạp hoạt động bình thường; cấm vô hiệu hóa cảm biến.',
        'Lắp lan can, nút dừng khẩn cấp quanh phễu nạp; tuyệt đối không đưa tay chân vào trong.',
        'Đứng ngoài vùng nguy hiểm dùng móc dài chuyên dụng và làm việc theo nhóm 2 người.',
      ],
    },
    zh: {
      slogan: '待机不等于停机！未断电上锁严禁接近投料口！',
      measures: [
        '处理卡料或清扫前必须切断主电源、执行LOTO上锁并释放液压余压。',
        '确保投料口检修门安全联锁完好，严禁屏蔽或短接传感器。',
        '投料口周边设护栏与急停按钮，严禁将手脚伸入料斗内部。',
        '站在外部安全区使用专用长钩处理卡料，并严格两人监护作业。',
      ],
    },
    th: {
      slogan: 'โหมดสแตนด์บายไม่ใช่เครื่องหยุด! ห้ามเข้าใกล้ช่องป้อนหากยังไม่ตัดไฟและล็อก LOTO!',
      measures: [
        'ตัดไฟหลัก ล็อกกุญแจ LOTO และปล่อยแรงดันไฮดรอลิกก่อนแก้ไขของติดขัดทุกครั้ง',
        'ดูแลสวิตช์อินเตอร์ล็อกฝาช่องป้อนให้ใช้งานได้เสมอ ห้ามปิดหรือดัดแปลงเซ็นเซอร์',
        'ติดตั้งราวกันตกและปุ่มหยุดฉุกเฉิน ห้ามยื่นมือหรือเท้าเข้าในช่องป้อนเด็ดขาด',
        'ใช้ตะขอด้ามยาวจากภายนอกเขตอันตราย และทำงานเป็นคู่ 2 คน',
      ],
    },
    km: {
      slogan: 'ស្ថានភាពរង់ចាំមិនមែនឈប់ទេ! ហាមចូលជិតមាត់ចាក់សំរាមបើមិនទាន់ផ្តាច់ភ្លើង និង LOTO!',
      measures: [
        'ផ្តាច់ភ្លើងមេ ចាក់សោ LOTO និងបញ្ចេញសម្ពាធប្រេងមុនដោះសំរាមជាប់។',
        'រក្សាប្រព័ន្ធឈប់ស្វ័យប្រវត្តិទ្វារមាត់ចាក់ឲ្យដំណើរការជានិច្ច ហាមបិទសេនស័រ។',
        'ដំឡើងបង្កាន់ដៃ និងប៊ូតុងបញ្ឈប់បន្ទាន់ ហាមលូកដៃ ឬជើងចូលក្នុងមាត់ចាក់។',
        'ប្រើទំពក់ដងវែងពីខាងក្រៅតំបន់គ្រោះថ្នាក់ និងធ្វើការជាគូ ២នាក់។',
      ],
    },
    uz: {
      slogan: 'Kutish rejimi to‘xtash emas! Elektrni o‘chirib LOTO qulflamasdan bunker yaqiniga bormang!',
      measures: [
        'Tiqilib qolgan chiqindini olishdan oldin tokni o‘chiring, LOTO qulflang va bosimni tushiring.',
        'Qopqoq blokirovkasini doim soz holda saqlang; sensorlarni aslo o‘chirmang.',
        'Bunker atrofida to‘siq va favqulodda to‘xtatish tugmasi bo‘lsin; qo‘l-oyoq tiqmang.',
        'Xavfsiz tashqi hududdan uzun maxsus ilgak bilan va 2 kishi bo‘lib ishlang.',
      ],
    },
  },
  'SVC-003': {
    en: {
      slogan: 'Never stand behind a truck! Engine OFF & wheel chocks before loading!',
      measures: [
        'Never stand behind reversing trucks or under docks; guide from a visible side zone.',
        'Start loading only after full stop, engine OFF, wheel chocks placed, and dock locked.',
        'Separate forklift paths from checking areas and wear high-visibility vests.',
        'Prevent accidental truck departure by collecting keys or designating driver wait areas.',
      ],
    },
    vi: {
      slogan: 'Đừng đứng sau xe tải! Tắt máy và chèn bánh trước khi bốc xếp!',
      measures: [
        'Cấm đứng sau xe tải đang lùi hoặc dưới gầm dock; dẫn đường từ bên hông dễ thấy.',
        'Chỉ cho xe nâng vào sau khi xe tải dừng hẳn, tắt máy, chèn bánh và khóa cầu dẫn.',
        'Tách biệt làn xe nâng với khu kiểm hàng và mặc áo phản quang khi làm việc.',
        'Thu chìa khóa hoặc bố trí phòng chờ tài xế để tránh xe tải tự ý khởi hành.',
      ],
    },
    zh: {
      slogan: '严禁站在车后！熄火垫好止轮木后再开始装卸！',
      measures: [
        '货车倒车靠台时严禁站在车后及月台下方，引导员须在侧面安全区指挥。',
        '确认停稳、熄火、垫好止轮木并锁定登车桥后，方可允许叉车进出装卸。',
        '明确区分叉车通道与理货区，全员穿戴高可视反光背心。',
        '实行司机候车室或钥匙暂管制度，防止装卸中货车误启动。',
      ],
    },
    th: {
      slogan: 'ห้ามยืนหลังรถบรรทุก! ดับเครื่องและหนุนล้อให้เรียบร้อยก่อนขนถ่าย!',
      measures: [
        'ห้ามยืนหลังรถบรรทุกขณะถอยเข้าชานชาลา ให้ยืนให้สัญญาณจากด้านข้างที่คนขับมองเห็น',
        'เริ่มขนถ่ายได้เมื่อรถหยุดสนิท ดับเครื่อง วางหมอนหนุนล้อ และล็อกสะพานปรับระดับแล้ว',
        'แยกทางเดินรถโฟล์คลิฟท์ออกจากจุดตรวจสินค้า และสวมเสื้อสะท้อนแสงทุกคน',
        'เก็บกุญแจรถหรือจัดห้องพักคนขับเพื่อป้องกันรถบรรทุกออกตัวโดยไม่ตั้งใจ',
      ],
    },
    km: {
      slogan: 'ហាមឈរពីក្រោយឡានដឹកទំនិញ! ពន្លត់ម៉ាស៊ីន និងដាក់កំណល់កង់មុនលើកទំនិញ!',
      measures: [
        'ហាមឈរពីក្រោយឡានពេលថយក្រោយ ត្រូវឈរផ្តល់សញ្ញាពីចំហៀងដែលអ្នកបើកមើលឃើញ។',
        'ចាប់ផ្តើមលើកទំនិញតែពេលឡានឈប់ស្ងៀម ពន្លត់ម៉ាស៊ីន ដាក់កំណល់កង់ និងចាក់សោស្ពាន។',
        'បែងចែកផ្លូវរថយន្តលើកទំនិញពីកន្លែងពិនិត្យទំនិញ និងពាក់អាវចំណាំងផ្លាត។',
        'រក្សាសោឡាន ឬកំណត់កន្លែងរង់ចាំសម្រាប់អ្នកបើក ដើម្បីការពារឡានចេញដំណើរដោយចៃដន្យ។',
      ],
    },
    uz: {
      slogan: 'Yuk mashinasi orqasida turmang! Dvigatelni o‘chirib g‘ildirak tagiga tirgak qo‘ying!',
      measures: [
        'Orqaga yurayotgan yuk mashinasi orqasida turmang; haydovchiga ko‘rinadigan yon tomondan boshqaring.',
        'To‘liq to‘xtab, dvigatel o‘chirilgach va g‘ildirak tirgagi qo‘yilgach yuklashni boshlang.',
        'Yuk ko‘targich yo‘lini tekshiruv zonasidan ajrating va nur qaytaruvchi nimcha kiying.',
        'Yuklash paytida mashina yurib ketmasligi uchun kalitni oling yoki haydovchini kutish xonasiga qo‘ying.',
      ],
    },
  },
};

/**
 * Fallback translations by HazardType for custom user-uploaded JSON cases.
 */
const HAZARD_FALLBACK_TRANSLATIONS: Record<
  'fall' | 'caught' | 'struck' | 'confined' | 'collapse',
  Record<ActiveForeignLang, CaseTranslationPack>
> = {
  fall: CASE_TRANSLATIONS['CON-001'],
  caught: CASE_TRANSLATIONS['MFG-001'],
  struck: CASE_TRANSLATIONS['MFG-002'],
  confined: CASE_TRANSLATIONS['CON-004'],
  collapse: CASE_TRANSLATIONS['CON-002'],
};

function resolveHazardFallbackKey(
  hazard: HazardType
): 'fall' | 'caught' | 'struck' | 'confined' | 'collapse' {
  const h = (hazard || '').trim();
  if (/질식|중독|감전|누전|화학/.test(h)) return 'confined';
  if (/끼임|협착|말림/.test(h)) return 'caught';
  if (/붕괴|무너짐|매몰/.test(h)) return 'collapse';
  if (/부딪힘|충돌|맞음|낙하|깔림|뒤집힘|전도/.test(h)) return 'struck';
  return 'fall';
}

/**
 * Seasonal 1-line warning translations (Zero API).
 */
const SEASONAL_TRANSLATIONS: Record<
  Exclude<SeasonRiskId, 'always'>,
  Record<ActiveForeignLang, string>
> = {
  winter: {
    en: 'Winter Alert: Test O2/CO & ventilate heated curing areas; de-ice slippery walkways.',
    vi: 'Cảnh báo mùa đông: Đo khí O2/CO & thông gió khu dưỡng hộ; chống trơn trượt băng giá.',
    zh: '冬季警示：密闭养护区先测氧/CO并通风，结冰通道及时除雪防滑。',
    th: 'เตือนหน้าหนาว: วัดค่า O2/CO และระบายอากาศเขตบ่มคอนกรีต พร้อมป้องกันพื้นลื่นน้ำแข็ง',
    km: 'ប្រុងប្រយ័ត្នរដូវរងា៖ វាស់ O2/CO និងបញ្ចេញខ្យល់តំបន់កំដៅ និងការពារផ្លូវរអិលទឹកកក។',
    uz: 'Qish ogohlantirishi: Yopiq isitish joyida O2/CO o‘lchang va muzlagan yo‘llarni tozalang.',
  },
  thaw: {
    en: 'Thaw Season Alert: Inspect excavation slopes for cracks & shoring shifts before work.',
    vi: 'Cảnh báo mùa tan băng: Kiểm tra vết nứt taluy và khung chống sạt lở trước khi làm.',
    zh: '解冻期警示：作业前严查边坡裂缝与挡土支护变形，严防坍塌。',
    th: 'เตือนช่วงดินละลาย: ตรวจรอยร้าวบ่อขุดและค้ำยันกันดินพังก่อนเข้าทำงานทุกครั้ง',
    km: 'ប្រុងប្រយ័ត្នរដូវរលាយទឹកកក៖ ពិនិត្យស្នាមប្រេះដី និងទម្រការពារបាក់ដីមុនធ្វើការ។',
    uz: 'Erish mavsumi: Ishdan oldin qazish devoridagi yoriq va tayanchlarni tekshiring.',
  },
  monsoon: {
    en: 'Rainy Season Alert: Check GFCI/grounding on wet tools; drain trenches & prevent roof slips.',
    vi: 'Cảnh báo mùa mưa: Kiểm tra chống giật/tiếp địa thiết bị điện; thoát nước hố đào & chống trượt.',
    zh: '雨季警示：潮湿区核查漏电保护与接地，雨后排水防滑后再开工。',
    th: 'เตือนหน้าฝน: ตรวจเบรกเกอร์กันดูดและสายดิน ระบายน้ำบ่อขุด และระวังหลังคาลื่น',
    km: 'ប្រុងប្រយ័ត្នរដូវភ្លៀង៖ ពិនិត្យឌីសង់ទ័រការពារឆក់ បង្ហូរទឹករណ្តៅ និងការពាររអិល។',
    uz: 'Yomg‘ir mavsumi: Elektr asboblar himoyasini tekshiring, chuqurdan suvni chiqaring.',
  },
  heatwave: {
    en: 'Heatwave Alert: Follow Water-Shade-Rest (10-15 min/hr) and watch coworkers for heatstroke.',
    vi: 'Cảnh báo nắng nóng: Tuân thủ Nước-Bóng mát-Nghỉ ngơi (10-15 phút/giờ) phòng say nắng.',
    zh: '高温警示：落实饮水·遮阳·每小时休息10~15分钟，互查中暑征兆。',
    th: 'เตือนอากาศร้อนจัด: ปฏิบัติตามหลัก น้ำ-ร่มเงา-พัก (10-15 นาที/ชม.) ป้องกันโรคลมแดด',
    km: 'ប្រុងប្រយ័ត្នកំដៅខ្លាំង៖ អនុវត្ត ទឹក-ម្លប់-សម្រាក (10-15នាទី/ម៉ោង) ការពារខ្យល់គរ។',
    uz: 'Jazirama ogohlantirishi: Suv-Soya-Dam (soatiga 10-15 daqiqa) qoidasiga rioya qiling.',
  },
};

export function getCaseTranslations(
  accidentCase: AccidentCase,
  lang: ForeignLanguageCode
): CaseTranslationPack | null {
  if (lang === 'none') return null;
  const exact = CASE_TRANSLATIONS[accidentCase.id]?.[lang];
  if (exact) return exact;
  const key = resolveHazardFallbackKey(accidentCase.hazard_type);
  return HAZARD_FALLBACK_TRANSLATIONS[key]?.[lang] ?? null;
}

export function getSeasonalTranslation(
  season: SeasonRiskId,
  lang: ForeignLanguageCode
): string | null {
  if (season === 'always' || lang === 'none') return null;
  return SEASONAL_TRANSLATIONS[season]?.[lang] ?? null;
}

export function getForeignLanguageNativeLabel(lang: ForeignLanguageCode): string {
  return FOREIGN_LANGUAGE_OPTIONS.find((o) => o.code === lang)?.nativeLabel ?? '';
}
