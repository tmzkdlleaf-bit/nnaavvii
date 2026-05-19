/* ================================================================= */
/*  Config.js — 전체 설정 및 데이터 보관소                             */
/*                                                                   */
/*  ★★★ 배포 전 이 파일을 가장 먼저 수정하세요 ★★★                   */
/*                                                                   */
/*  수정해야 할 항목 (위에서부터 순서대로):                              */
/*   1. SUPABASE_URL      — Supabase 프로젝트 URL                    */
/*   2. SUPABASE_ANON_KEY — Supabase 공개(anon) 키                   */
/*   3. IMGBB_API_KEY     — imgbb.com 이미지 업로드 키                 */
/*   4. charOwners        — 이메일 ↔ 캐릭터 ID 연결                   */
/*   5. adminEmails       — 관리자(GM) 이메일                         */
/*   6. charData          — 캐릭터 기본 정보 (이름·이미지·능력치 등)     */
/*   7. shopItems         — 상점에서 판매할 아이템 목록                 */
/*                                                                   */
/*  ⚠️  이 파일을 수정한 뒤에는 반드시 브라우저를 새로고침(F5)하세요.     */
/* ================================================================= */


/* ─────────────────────────────────────────────────────────────────
   1. 데이터베이스(Supabase) 및 이미지 서버(ImgBB) 연결 키

   Supabase 키 발급 방법:
     ① https://supabase.com 접속 → 로그인 → 새 프로젝트 생성
     ② 좌측 메뉴 [Settings] → [API] 클릭
     ③ "Project URL" → 아래 SUPABASE_URL에 복붙
     ④ "anon public" 키 → 아래 SUPABASE_ANON_KEY에 복붙

   ImgBB 키 발급 방법:
     ① https://imgbb.com 가입 후 로그인
     ② https://api.imgbb.com 접속 → "Get API key" 클릭
     ③ 발급된 키 → 아래 IMGBB_API_KEY에 복붙
───────────────────────────────────────────────────────────────── */

// ★ 반드시 실제 값으로 교체하세요!
const SUPABASE_URL      = 'https://여기에_프로젝트URL을_입력하세요.supabase.co';
const SUPABASE_ANON_KEY = '여기에_anon_public_키를_입력하세요';
const IMGBB_API_KEY     = '여기에_imgbb_api_키를_입력하세요';

/* 이미지를 불러오지 못했을 때 대신 표시할 임시(더미) 이미지입니다. */
/* ★ 원하시면 직접 만든 이미지 URL로 교체해도 됩니다.              */
const PLACEHOLDER_IMG  = 'https://placehold.co/60x60/3a3a36/d7b33d?text=Img';
const PLACEHOLDER_ITEM = 'https://placehold.co/60x60/3a3a36/d7b33d?text=Item';
const PLACEHOLDER_100  = 'https://placehold.co/100x100/3a3a36/d7b33d?text=No+Img';

/* 데이터베이스 클라이언트(접속기)를 준비합니다. 이 코드는 건드리지 마세요. */
let supabaseClient = null;
try {
    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
} catch (e) {
    console.error('DB 연결에 실패했습니다. SUPABASE_URL과 SUPABASE_ANON_KEY를 확인하세요.', e);
}


/* ─────────────────────────────────────────────────────────────────
   2. 플레이어 이메일 ↔ 캐릭터 연결

   형식: '로그인에 사용하는 이메일': 'char-캐릭터ID'
   캐릭터ID는 아래 charData의 id 앞에 'char-'를 붙인 값입니다.

   예) charData에 id: 'ho1' 이라면 → 'char-ho1'

   ★ 플레이어를 추가할 때마다 한 줄씩 추가하면 됩니다:
      '새플레이어@example.com': 'char-새캐릭터id',
───────────────────────────────────────────────────────────────── */
const charOwners = {
    'player1@example.com': 'char-ho1',   // 1번 캐릭터 주인
    'player2@example.com': 'char-ho2',   // 2번 캐릭터 주인
    'player3@example.com': 'char-ho3',   // 3번 캐릭터 주인
    'player4@example.com': 'char-ho4',   // 4번 캐릭터 주인
    /*
    ★ 캐릭터 추가 시 아래를 복사해 붙여넣으세요:
    '이메일@example.com': 'char-새아이디',
    */
};

/* 관리자(GM) 이메일 목록입니다.
   이 이메일로 로그인하면 모든 캐릭터의 소지금을 직접 수정할 수 있습니다.
   ★ 복수 지정 가능: 쉼표로 구분해 추가하세요. */
const adminEmails = [
    'admin@example.com',   // ★ 실제 GM 이메일로 바꾸세요
];


/* ─────────────────────────────────────────────────────────────────
   3. 캐릭터 기본 데이터

   각 항목 설명:
     id       : 캐릭터 고유 번호 (영문+숫자만, 다른 캐릭터와 중복 금지)
                → HTML에서 id="char-{id}" 형태로 사용됩니다
     name     : 화면에 표시될 캐릭터 이름 (한글 가능)
     title    : 소속 문파/조직 이름
     img      : 기본 프로필 이미지 URL (로그인 후 직접 변경 가능)
     quote    : 캐릭터 대표 대사 (로그인 후 직접 변경 가능)
     sheetUrl : 캐릭터 시트 링크 (CCFOLIA, 구글 시트 등의 URL)
                → '#'으로 두면 링크 없이 버튼만 표시됩니다
     stats    : 능력치 8개를 쉼표로 구분 (0~100)
                순서: 근력, 건강, 크기, 민첩, 외모, 지능, 정신, 교육
     color    : 테마 색상 (R, G, B 형식 — 레이더 차트와 강조색에 사용)

   ★ 캐릭터 추가 방법:
     아래 배열에 아래 형식의 블록을 복사해 추가하고
     charOwners에도 이메일-ID 매핑을 추가하세요.

   ★ 캐릭터 삭제 방법:
     해당 블록을 삭제하고 charOwners에서도 해당 줄을 삭제하세요.
───────────────────────────────────────────────────────────────── */
const charData = [

    /* ── 캐릭터 1 ── */
    {
        id:       'ho1',
        name:     '캐릭터1 이름',       // ★ 실제 캐릭터 이름으로 변경
        title:    '소속 문파1',         // ★ 소속 조직 이름으로 변경
        img:      'https://placehold.co/300x300/1a1614/d7b33d?text=Char+1', // ★ 실제 이미지 URL로 변경
        quote:    '캐릭터 대표 대사를 여기에 입력하세요.',                   // ★ 대사 변경
        sheetUrl: '#',                  // ★ CCFOLIA 또는 시트 URL로 변경 (예: 'https://ccfolia.com/rooms/...')
        stats:    '50,50,50,50,50,50,50,50', // ★ 근력,건강,크기,민첩,외모,지능,정신,교육 (0~100)
        color:    '215, 179, 61',       // ★ 테마 색상 R,G,B (골드)
    },

    /* ── 캐릭터 2 ── */
    {
        id:       'ho2',
        name:     '캐릭터2 이름',
        title:    '소속 문파1',
        img:      'https://placehold.co/300x300/1a1614/cccccc?text=Char+2',
        quote:    '캐릭터 대표 대사를 여기에 입력하세요.',
        sheetUrl: '#',
        stats:    '50,50,50,50,50,50,50,50',
        color:    '204, 204, 204',      // 실버 계열
    },

    /* ── 캐릭터 3 ── */
    {
        id:       'ho3',
        name:     '캐릭터3 이름',
        title:    '소속 문파2',
        img:      'https://placehold.co/300x300/1a1614/4caf50?text=Char+3',
        quote:    '캐릭터 대표 대사를 여기에 입력하세요.',
        sheetUrl: '#',
        stats:    '50,50,50,50,50,50,50,50',
        color:    '76, 175, 80',        // 초록 계열
    },

    /* ── 캐릭터 4 ── */
    {
        id:       'ho4',
        name:     '캐릭터4 이름',
        title:    '소속 문파2',
        img:      'https://placehold.co/300x300/1a1614/4c8bf5?text=Char+4',
        quote:    '캐릭터 대표 대사를 여기에 입력하세요.',
        sheetUrl: '#',
        stats:    '50,50,50,50,50,50,50,50',
        color:    '76, 139, 245',       // 파랑 계열
    },

    /*
    ★ 캐릭터 추가 시 아래 블록을 복사해 붙여넣으세요:

    {
        id:       'ho5',               // ← 고유 ID (다른 것과 겹치지 않게)
        name:     '새 캐릭터 이름',
        title:    '소속 문파',
        img:      'https://이미지URL',  // ← 실제 이미지 URL
        quote:    '대표 대사',
        sheetUrl: '#',                 // ← 시트 URL 또는 '#'
        stats:    '50,50,50,50,50,50,50,50',
        color:    '147, 223, 60',      // R, G, B
    },
    */
];


/* ─────────────────────────────────────────────────────────────────
   4. 연습용 더미(샌드백) 캐릭터

   대련장에서 실제 플레이어 없이 혼자 연습할 때 상대가 되는 캐릭터입니다.
   난이도 조정은 Combat.js의 DUMMY_PRESETS 배열에서 합니다.
   이 객체는 기본 정의용이므로 직접 수정할 일은 거의 없습니다.
───────────────────────────────────────────────────────────────── */
const DUMMY_CHAR = {
    id:      'char-dummy',
    name:    '목인장(木人樁)',   // 연습 상대 이름
    img:     PLACEHOLDER_100,
    hp:      8,  maxHp: 8,
    str: 50, con: 50, siz: 50, dex: 50,
    brawl:   40,   // 격투 기능치
    dodge:   30,   // 회피 기능치
    db:      { dice: 0, mod: 0, label: '없음' },  // 데미지 보너스
    weapons: [],
};


/* ─────────────────────────────────────────────────────────────────
   5. 상점 판매 아이템 목록

   각 항목 설명:
     name  : 아이템 이름
     desc  : 아이템 설명
     price : 가격 (단위: G)
     img   : 아이템 아이콘 이미지 URL
     type  : 종류
               'item'      → 일반 아이템 (인벤토리 소지품 탭에 저장)
               'wallpaper' → 벽지 (마이룸 보관함에 저장, colorL/colorR 또는 bgImg 필요)
               'floor'     → 바닥재 (마이룸 보관함에 저장, color 필요)
               'furniture' → 가구 (마이룸 보관함에 저장, width/height 필요)

   벽지 추가 필드:
     colorL : 왼쪽 벽 색상 (hex, 예: '#fcdada')
     colorR : 오른쪽 벽 색상
     bgImg  : 배경 이미지 URL (색상 대신 이미지를 쓰고 싶을 때)

   가구 추가 필드:
     width  : 가구 가로 크기(px) — 80px = 1칸
     height : 가구 세로 크기(px)

   ★ 아이템 추가: 아래 목록에 블록을 복사해 추가하세요.
───────────────────────────────────────────────────────────────── */
const shopItems = [

    /* ── 일반 아이템 ── */
    {
        name:  '현수막 변경권',
        desc:  '홈 화면의 현수막(배너) 이미지를 변경합니다. 다른 사람이 바꾸기 전까지 유지됩니다.',
        price: 150,
        img:   'https://placehold.co/100x100/3a3a36/d7b33d?text=Banner',
        type:  'item',
    },
    {
        name:  '가구 생성권',
        desc:  '나만의 커스텀 가구를 직접 제작할 수 있습니다. 마이룸 보관함에 추가됩니다.',
        price: 5000,
        img:   'https://placehold.co/100x100/d7b33d/000?text=DIY',
        type:  'item',
    },

    /* ── 벽지 ── */
    {
        name:   '봄날 벽지',
        desc:   '화사한 분홍빛으로 방 전체를 물들입니다.',
        price:  1500,
        img:    'https://placehold.co/100x100/fcdada/c88?text=Wall',
        type:   'wallpaper',
        colorL: '#fcdada',   // 왼쪽 벽 색상
        colorR: '#f5bfbf',   // 오른쪽 벽 색상 (살짝 어둡게)
    },
    {
        name:   '배경 사진 벽지',
        desc:   '사진으로 된 배경 벽지입니다.',
        img:    'https://placehold.co/100x100/000055/8af?text=BG',
        price:  3500,
        type:   'wallpaper',
        bgImg:  'https://placehold.co/800x400/000055/8af?text=Background', // ★ 실제 배경 이미지 URL로 변경
    },

    /* ── 바닥재 ── */
    {
        name:  '원목 마루',
        desc:  '따뜻한 나무 질감의 원목 바닥재입니다.',
        price: 800,
        img:   'https://placehold.co/100x100/8b6914/fff?text=Wood',
        type:  'floor',
        color: '#a0784a',    // 바닥 타일 색상
    },
    {
        name:  '대리석 타일',
        desc:  '고급스러운 흰색 대리석 바닥재입니다.',
        price: 1200,
        img:   'https://placehold.co/100x100/e8e8e8/888?text=Tile',
        type:  'floor',
        color: '#d8d0c8',
    },

    /* ── 가구 ── */
    {
        name:   '나무 책상',
        desc:   '고풍스러운 느낌의 원목 책상입니다.',
        price:  800,
        img:    'https://placehold.co/100x100/574c40/fff?text=Desk',
        type:   'furniture',
        width:  120,   // 가로 크기(px). 80 = 1칸, 160 = 2칸
        height: 80,    // 세로 크기(px)
    },
    {
        name:   '안락의자',
        desc:   '폭신폭신한 안락의자입니다.',
        price:  600,
        img:    'https://placehold.co/100x100/8b5e3c/fff?text=Chair',
        type:   'furniture',
        width:  80,
        height: 90,
    },

    /*
    ★ 아이템 추가 시 아래를 복사해 붙여넣으세요:

    일반 아이템:
    {
        name:  '아이템 이름',
        desc:  '아이템 설명',
        price: 1000,
        img:   'https://이미지URL',
        type:  'item',
    },

    가구:
    {
        name:   '가구 이름',
        desc:   '가구 설명',
        price:  1000,
        img:    'https://이미지URL',
        type:   'furniture',
        width:  80,
        height: 80,
    },
    */
];


/* ─────────────────────────────────────────────────────────────────
   6. 시스템 내부에서 사용하는 공용 변수들

   ⚠️  아래 변수들은 직접 수정하지 마세요.
   각 기능 함수들이 런타임에 자동으로 값을 채우고 갱신합니다.
───────────────────────────────────────────────────────────────── */

let currentUser         = null;   // 현재 로그인한 사용자 정보 (null이면 비로그인 상태)
let allProfiles         = [];     // DB에서 불러온 전체 캐릭터 프로필 데이터
let currentEditingId    = null;   // 현재 편집 중인 캐릭터 ID (예: 'char-ho1')
let currentEditingPhase = 0;      // 현재 편집 중인 부 번호 (0=1부, 1=2부, 2=3부, 3=4부)
let currentInvData      = [];     // 인벤토리 편집 모달에서 임시로 사용하는 20칸 배열
let currentSlotIndex    = -1;     // 인벤토리에서 클릭한 칸 번호 (-1이면 선택 없음)
let currentMailboxData  = [];     // 우편함 모달에서 임시로 사용하는 편지 목록
let currentHomeIdx      = 0;      // 홈 슬라이더가 현재 보여주는 슬라이드 번호 (0=1부)
let currentMoney        = 0;      // 미니게임/상점에서 사용하는 소지금 임시 캐시

let currentGalleryPage       = 1; // 갤러리 현재 페이지 번호
const GALLERY_POSTS_PER_PAGE = 5; // 갤러리 한 페이지당 표시할 게시글 수

/* 레이더 차트 꼭짓점에 표시될 능력치 이름 (stats 입력 순서와 반드시 일치해야 합니다) */
const STAT_LABELS = ['근력', '건강', '크기', '민첩', '외모', '지능', '정신', '교육'];
