/* ================================================================= */
/*  ui.js — 웹페이지 화면 조작 및 특수 효과 기능 파일                  */
/*  초보자 안내: 이 파일은 버튼을 눌렀을 때 화면이 바뀌고, 팝업창이 뜨고,  */
/*  배경이 어두워졌다가 밝아지는 등 눈에 보이는 움직임을 담당합니다.      */
/* ================================================================= */

// ─────────────────────────────────────────────────────────────────
// 1. 상단 메뉴(탭) 전환 기능
// ─────────────────────────────────────────────────────────────────
// 상단 네비게이션에서 '대문', '기록', '화첩' 등의 메뉴 버튼을 눌렀을 때 실행됩니다.
window.openTab = function (id, btn) {
    // 1. 먼저 화면에 열려있는 모든 창을 다 숨기고, 버튼의 불도 끕니다.
    document.querySelectorAll('.content-card').forEach(c => c.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));

    // 2. 사용자가 누른 메뉴의 창만 화면에 보여주고, 누른 버튼에 불을 켭니다.
    const target = document.getElementById(id);
    if (target) target.classList.add('active');
    if (btn)    btn.classList.add('active');
    else        document.querySelector('.nav-btn')?.classList.add('active');

    // 3. 탭이 바뀔 때마다 그 화면에 필요한 데이터나 그림을 새로고침해줍니다.
    // 화면이 짠 하고 나타나기 전에 그림을 그리면 꼬일 수 있어서 0.05초(50ms) 정도 뜸을 들입니다.
    setTimeout(() => { if (typeof drawAllRadarCharts   === 'function') drawAllRadarCharts(); }, 50);
    
    // 관계도 탭을 열었다면 인물 관계도를 그립니다.
    if (id === 'relations')  setTimeout(() => { if (typeof loadAndDrawMap          === 'function') loadAndDrawMap(); }, 50);
    // 상점 탭을 열었다면 내 소지금 숫자를 새로고침합니다.
    if (id === 'Shop')       setTimeout(() => { if (typeof updateShopMoneyDisplay  === 'function') updateShopMoneyDisplay(); }, 50);
    // 화첩(갤러리) 탭을 열었다면 갤러리 1페이지를 불러옵니다.
    if (id === 'Gallery')    { if (typeof loadGalleryData === 'function') loadGalleryData(1); }
    // 유흥장(미니게임) 탭을 열었다면 미니게임용 소지금을 부르고, 야바위 컵 위치를 정돈합니다.
    if (id === 'MiniGames')  {
        if (typeof updateMiniGameMoneyDisplay === 'function') updateMiniGameMoneyDisplay();
        if (typeof initShellPositions         === 'function') initShellPositions();
    }
    // 대련장 탭을 열었다면 싸울 상대를 고르는 목록을 준비시킵니다.
    if (id === 'Sparring' && typeof CombatSys !== 'undefined') CombatSys.initDropdowns();
};

// 1부, 2부, 3부, 4부 버튼을 눌러서 내용을 바꿀 때 쓰는 함수입니다.
window.changePhase = function (btn, idx) {
    // 지금 누른 버튼이 속한 커다란 박스를 찾습니다.
    const sec = btn.closest('.content-card');
    
    // 1부~4부 버튼들의 불을 다 끄고, 누른 버튼만 켭니다.
    sec.querySelectorAll('.phase-btn').forEach(t => t.classList.remove('active'));
    sec.querySelectorAll('.phase-slide').forEach(s => s.classList.remove('active'));
    sec.querySelectorAll('.phase-btn')[idx].classList.add('active');
    sec.querySelectorAll('.phase-slide')[idx].classList.add('active');
    
    // 지금 몇 부를 보고 있는지 컴퓨터 메모장에 적어둡니다.
    currentEditingPhase = idx;
    
    // 바뀐 화면(n부)에 맞춰서 능력치 레이더 차트를 다시 예쁘게 그립니다.
    const activeSlide = sec.querySelectorAll('.phase-slide')[idx];
    setTimeout(() => {
        if (typeof drawAllRadarCharts === 'function') drawAllRadarCharts(activeSlide);
    }, 50);
    
    // 갤러리에서 부를 바꿨다면 해당 부의 갤러리 데이터를 새로 불러옵니다.
    if (sec.id === 'Gallery' && typeof loadGalleryData === 'function') loadGalleryData(1);
};


// ─────────────────────────────────────────────────────────────────
// 2. 대문 홈 슬라이더 (사진 넘기기) 기능
// ─────────────────────────────────────────────────────────────────
// 몇 번째 슬라이드로 갈지 직접 지정하는 함수입니다.
window.goToHomeSlide = (n) => { currentHomeIdx = n; updateHomeSlider(); };
// 화살표를 눌러서 이전(-1) 혹은 다음(+1) 슬라이드로 넘어가는 함수입니다.
window.moveHomeSlide = (n) => { currentHomeIdx += n; updateHomeSlider(); };

// 실제로 사진들을 옆으로 슥 밀어서 보여주는 애니메이션 함수입니다.
function updateHomeSlider() {
    const track  = document.getElementById('home-track');
    const slides = document.querySelectorAll('.home-slide');
    const tabs   = document.querySelectorAll('#home-tabs .phase-btn');
    if (!track || slides.length === 0) return;
    
    // 사진이 4장인데 5번째로 가려고 하면 다시 1번째로 돌려보냅니다.
    if (currentHomeIdx >= slides.length) currentHomeIdx = 0;
    if (currentHomeIdx < 0)              currentHomeIdx = slides.length - 1;
    
    // CSS 기능을 이용해 사진 묶음을 왼쪽으로 슬쩍 밀어버립니다. (-100%, -200% ...)
    track.style.transform = `translateX(-${currentHomeIdx * 100}%)`;
    
    // 1부~4부 탭 버튼들도 사진 번호에 맞춰서 불을 켜줍니다.
    tabs.forEach((tab, i) => tab.classList.toggle('active', i === currentHomeIdx));
}


// ─────────────────────────────────────────────────────────────────
// 3. 팝업창(모달) 열기 / 닫기 기능
// ─────────────────────────────────────────────────────────────────
// 로그인 창을 화면 가운데에 띄웁니다.
window.openAuthModal = () => {
    const m = document.getElementById('auth-modal');
    if (m) { m.style.removeProperty('display'); m.classList.add('show'); }
};

// 팝업창을 화면에서 숨깁니다.
window.closeModal = (id) => {
    const m = document.getElementById(id);
    if (m) { m.style.removeProperty('display'); m.classList.remove('show'); }
};


// ─────────────────────────────────────────────────────────────────
// 4. 사진 크게 보기 (라이트박스) 기능
// ─────────────────────────────────────────────────────────────────
// 화면의 조그만 사진을 눌렀을 때, 검은 배경에 사진을 크게 띄워줍니다.
window.openLightbox = (imgSrc) => {
    document.getElementById('lightbox-img').src = imgSrc;
    document.getElementById('image-lightbox').classList.add('show');
};
// 크게 띄운 사진 창을 닫습니다.
window.closeLightbox = () => {
    document.getElementById('image-lightbox').classList.remove('show');
};


// ─────────────────────────────────────────────────────────────────
// 5. 밝은 테마 / 어두운 테마 변경 기능
// ─────────────────────────────────────────────────────────────────
// 오른쪽 아래의 동그란 버튼을 눌러 화면 테마를 바꿉니다.
window.toggleTheme = function () {
    const body = document.body;
    const icon = document.getElementById('theme-icon');
    
    // 'light-mode' 라는 이름표(클래스)를 뗐다 붙였다 하면서 화면 스타일을 바꿉니다.
    const isLight = body.classList.toggle('light-mode');
    body.setAttribute('data-theme', isLight ? 'light' : 'dark');
    
    // 다음번에 사이트에 들어왔을 때도 지금 테마를 유지하도록 인터넷 브라우저에 몰래 저장해둡니다.
    try {
        if (body.classList.contains('light-mode')) {
            localStorage.setItem('theme', 'light');
            // 밝은 테마일 때는 어두운 테마로 돌아가는 달(Dark) 아이콘으로 바꿉니다.
            if (icon) icon.src = 'https://placehold.co/50x50/f5f3f0/b58b1f?text=Dark';
        } else {
            localStorage.setItem('theme', 'dark');
            // 어두운 테마일 때는 밝은 테마로 돌아가는 해(Light) 아이콘으로 바꿉니다.
            if (icon) icon.src = 'https://placehold.co/50x50/1a1614/d7b33d?text=Light';
        }
    } catch (e) {
        // 브라우저 저장 기능을 쓸 수 없는 특수한 환경이면 아이콘만 바꿉니다.
        if (icon) icon.src = body.classList.contains('light-mode')
            ? 'https://placehold.co/50x50/f5f3f0/b58b1f?text=Dark'
            : 'https://placehold.co/50x50/1a1614/d7b33d?text=Light';
    }
};

// 사이트에 처음 들어왔을 때, 예전에 저장해둔 테마가 있는지 확인하고 알아서 맞춰주는 함수입니다.
function loadTheme() {
    try {
        const savedTheme = localStorage.getItem('theme');
        const icon       = document.getElementById('theme-icon');
        const isLight = savedTheme === 'light'; // 저장된 게 light면 밝은 테마
        
        document.body.classList.toggle('light-mode', isLight);
        document.body.setAttribute('data-theme', isLight ? 'light' : 'dark');
        
        // 아이콘도 테마에 맞게 끼워줍니다.
        if (icon) icon.src = isLight 
            ? 'https://placehold.co/50x50/f5f3f0/b58b1f?text=Dark' 
            : 'https://placehold.co/50x50/1a1614/d7b33d?text=Light';
    } catch (e) {
        console.warn("브라우저 저장소를 사용할 수 없습니다.");
    }
}


// ─────────────────────────────────────────────────────────────────
// 6. 둥둥 떠다니는 배경 먼지 효과
// ─────────────────────────────────────────────────────────────────
// 화면 뒤쪽에서 하얀 먼지 조각 40개가 천천히 위로 떠오르게 만드는 장식용 함수입니다.
function createDust() {
    const c = document.getElementById('dust-container');
    if (!c) return;
    
    // 40개의 작은 먼지 조각(div)을 만듭니다.
    for (let i = 0; i < 40; i++) {
        const p = document.createElement('div');
        p.className = 'dust-particle';
        
        // 크기, 나오는 위치, 떠오르는 속도를 무작위(랜덤)로 정해서 자연스럽게 만듭니다.
        p.style.cssText = `
            width:${Math.random() * 3 + 1}px;
            height:${Math.random() * 3 + 1}px;
            left:${Math.random() * 100}vw;
            top:${Math.random() * 100 + 50}vh;
            animation-duration:${Math.random() * 15 + 10}s;`;
        
        c.appendChild(p); // 화면에 먼지를 뿌립니다.
    }
}


// ─────────────────────────────────────────────────────────────────
// 7. 인물 탭의 NPC 관계 배지(스티커) 색칠하기
// ─────────────────────────────────────────────────────────────────
// '적', '아군' 등 적혀있는 글씨를 확인해서 알맞은 색깔의 스티커를 카드 오른쪽 위에 붙여줍니다.
function buildRelationBadges() {
    // 글씨에 따른 스티커 색상표입니다. (배경색과 글자색)
    const colorMap = {
        "적":     { bg: "#7b1111", text: "#ffdada" }, // 빨간색 계열
        "아군":   { bg: "#1a4d2e", text: "#d4f7e0" }, // 초록색 계열
        "중립":   { bg: "#3a3a3a", text: "#cccccc" }, // 회색 계열
        "의뢰인": { bg: "#0d2d5e", text: "#cce0ff" }  // 파란색 계열
    };
    
    // 관계 스티커를 달아야 할 카드들을 전부 찾아서 순서대로 처리합니다.
    document.querySelectorAll('.relation-card[data-relation]').forEach(card => {
        if (card.querySelector('.relation-badge')) return; // 이미 달았으면 넘어감
        
        const rel   = card.dataset.relation; // 카드에 적힌 관계 글씨 (예: "적")
        const style = colorMap[rel]; // 글씨에 맞는 색상을 표에서 찾음
        if (!style) return;
        
        // 스티커(span)를 만들어서 예쁘게 디자인을 입힙니다.
        const badge = document.createElement('span');
        badge.className   = 'relation-badge';
        badge.textContent = rel;
        badge.style.cssText = `
            position:absolute; top:10px; right:10px;
            background:${style.bg}; color:${style.text};
            padding:2px 8px; border-radius:4px;
            font-size:0.7rem; font-weight:bold;`;
            
        card.style.position = 'relative';
        card.prepend(badge); // 카드의 맨 앞쪽에 스티커를 붙여줍니다.
    });
}


// ─────────────────────────────────────────────────────────────────
// 8. 기록(로그 백업) 대화 내용 색칠하기 기능
// ─────────────────────────────────────────────────────────────────
// TRPG나 역할극에서 텍스트로 저장된 대화 로그를 읽고, 누가 말했는지 확인해서
// 그 사람의 고유 색깔로 예쁘게 글씨를 바꿔주는 기능입니다.
function parseAllLogs() {
    // 4인용 캐릭터 이름과 그 캐릭터의 상징색을 지정해둔 색상표입니다.
    const charColors = {
        "가나다":   "#e5c56d", // 금색
        "라마바":   "#cccccc", // 은색
        "사아자":   "#4caf50", // 초록
        "차카타":   "#4c8bf5", // 파랑
        "GM":       "#d7b33d", // 마스터 색상
        "system":   "#888"     // 시스템 메시지 색상
    };
    
    // 화면에 있는 모든 로그 내용 박스를 찾아서 확인합니다.
    document.querySelectorAll('.details-content').forEach(container => {
        if (container.innerHTML.includes('class="log-item"')) return; // 이미 색칠했으면 넘어갑니다.
        
        const raw     = container.innerHTML.replace(/&nbsp;/g, ' ').trim();
        // "[main] 가나다 : 안녕!" 이라는 글의 규칙을 찾아내는 공식입니다.
        const pattern = /\[main\]\s*(.*?)\s*:\s*(.*?)(?=\s*\[main\]|$)/g;
        
        let html = "", match;
        // 규칙에 맞는 대화를 하나씩 찾아내서 분석합니다.
        while ((match = pattern.exec(raw)) !== null) {
            const name    = match[1].trim(); // 말한 사람 (예: 가나다)
            const message = match[2].trim(); // 말한 내용 (예: 안녕!)
            const color   = charColors[name] || "#ccc"; // 사람 이름으로 색깔표에서 색을 찾습니다.
            
            // 찾아낸 이름에 색깔을 입혀서 예쁜 HTML 블록으로 만듭니다.
            html += `
                <div class="log-item" style="margin-bottom:8px; line-height:1.5;">
                    <b class="log-name" style="color:${color}; margin-right:8px;">${name}</b>
                    <span class="msg-text" style="color:#eee;">${message}</span>
                </div>`;
        }
        
        // 만들어진 예쁜 블록을 원래 밋밋했던 글씨 대신에 덮어씌웁니다.
        if (html) container.innerHTML = html;
    });
}