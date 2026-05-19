/* ================================================================= */
/*  Auth.js — 인증 및 데이터베이스(DB) 공통 기능 설정 파일                 */
/*  초보자 안내: 이 파일은 로그인/로그아웃을 처리하고, 화면에 수정 버튼을      */
/*  달아주며, 데이터베이스에 정보를 저장하거나 불러오는 역할을 합니다.       */
/* ================================================================= */

/* ─────────────────────────────────────────────────────────────────
   1. 로그인 / 회원가입 / 로그아웃 기능
───────────────────────────────────────────────────────────────── */
// 로그인 버튼을 눌렀을 때 실행되는 함수입니다. (async는 서버 응답을 기다리겠다는 뜻입니다)
window.handleLogin = async function () {
    // 화면의 입력칸에서 이메일과 비밀번호를 가져옵니다.
    const e = document.getElementById('auth-email').value;
    const p = document.getElementById('auth-password').value;
    
    // 데이터베이스(Supabase)에 이메일과 비밀번호를 보내 로그인을 시도합니다.
    const { error } = await supabaseClient.auth.signInWithPassword({ email: e, password: p });
    
    if (error) alert('로그인 실패: ' + error.message); // 에러가 나면 알림을 띄웁니다.
    else location.reload(); // 성공하면 화면을 새로고침하여 로그인된 상태로 만듭니다.
};

// 새로 가입하기 버튼을 눌렀을 때 실행되는 함수입니다.
window.handleSignUp = async function () {
    const e = document.getElementById('auth-email').value;
    const p = document.getElementById('auth-password').value;
    
    // 데이터베이스에 새 계정을 만들어달라고 요청합니다.
    const { error } = await supabaseClient.auth.signUp({ email: e, password: p });
    
    if (error) alert('가입 실패: ' + error.message);
    else { 
        alert('가입 완료! 로그인 해주세요.'); 
        closeModal('auth-modal'); // 가입 성공 시 팝업창을 닫습니다.
    }
};

// 로그아웃 버튼을 눌렀을 때 실행되는 함수입니다.
window.signOut = async function () {
    await supabaseClient.auth.signOut(); // 로그아웃을 요청하고 완료될 때까지 기다립니다.
    location.reload(); // 화면을 새로고침해서 로그아웃 상태로 돌아갑니다.
};

// 로그인 모달(팝업창)을 화면에 띄우는 함수입니다.
window.openAuthModal = function () {
    var m = document.getElementById('auth-modal');
    if (m) m.classList.add('show'); // 'show' 클래스를 추가해서 화면에 보이게 합니다.
};


/* ─────────────────────────────────────────────────────────────────
   2. 로그인 상태 확인 및 편집 버튼 달아주기
───────────────────────────────────────────────────────────────── */
// 현재 사용자가 로그인했는지 확인하고, 권한에 맞게 연필(수정) 버튼을 화면에 그려주는 함수입니다.
async function checkLoginState() {
    if (!supabaseClient) return; // 데이터베이스가 연결 안 되어있으면 그냥 종료합니다.

    var user = null;
    try {
        // 현재 로그인된 사용자 정보를 가져옵니다.
        var res = await supabaseClient.auth.getUser();
        user = (res.data && res.data.user) ? res.data.user : null;
    } catch (e) { console.warn('getUser 실패:', e); return; }
    
    currentUser = user; // 가져온 사용자 정보를 전역 변수에 저장합니다.

    // 로그인, 로그아웃 버튼 보여주기/숨기기 처리
    var loginBtn  = document.getElementById('login-btn');
    var logoutBtn = document.getElementById('logout-btn');
    if (!user) return; // 로그인이 안 되어있으면 여기서 멈춥니다. (아래 코드는 실행 안 됨)
    if (loginBtn)  loginBtn.style.display  = 'none'; // 로그인 버튼 숨기기
    if (logoutBtn) logoutBtn.style.display = 'inline-block'; // 로그아웃 버튼 보이기

    // 관리자 전용 권한 설정: 관리자 이메일이면 남의 소지금(돈)도 수정할 수 있게 만듭니다.
    if (adminEmails.includes(user.email)) {
        document.querySelectorAll('.money-row').forEach(function (row) {
            row.classList.add('editable-area'); // 클릭할 수 있게 마우스 커서를 바꿔주는 클래스입니다.
            row.onclick = function () {
                var charId = row.closest('.content-card') ? row.closest('.content-card').id : null;
                var slide  = row.closest('.phase-slide');
                var phaseIndex = slide ? Array.from(slide.parentNode.children).indexOf(slide) : 0;
                if (charId) openMoneyModal(charId, phaseIndex); // 소지금 수정 팝업 열기
            };
        });
    }

    // 본인 캐릭터인지 확인: 이메일에 맞는 캐릭터 아이디를 찾습니다.
    var myCharId = charOwners[user.email];
    if (!myCharId) return; // 내 캐릭터가 없으면 여기서 멈춥니다.
    var section = document.getElementById(myCharId);
    if (!section) return;
    
    var base = charData.find(function (c) { return c.id === myCharId.replace('char-', ''); });

    // 1. 캐릭터 한마디(대사) 옆에 연필 모양 수정 버튼을 만들어 붙입니다.
    section.querySelectorAll('.char-quote').forEach(function (q, i) {
        if (q.querySelector('.edit-icon-btn')) return; // 이미 버튼이 있으면 건너뜁니다.
        var btn = document.createElement('button');
        btn.className = 'edit-icon-btn';
        btn.innerHTML = '&#9998;'; // HTML 연필 모양 특수문자입니다.
        btn.onclick   = function () { openGeneralModal(myCharId, i); }; // 누르면 기본 정보 수정창이 뜹니다.
        if (base) btn.style.backgroundColor = 'rgb(' + base.color + ')'; // 캐릭터 고유 색상으로 칠합니다.
        q.appendChild(btn); // 텍스트 옆에 버튼을 콕 박아넣습니다.
    });

    // 2. 능력치 레이더 차트를 클릭하면 수정창이 뜨도록 설정합니다.
    section.querySelectorAll('.radar-chart').forEach(function (c, i) {
        c.classList.add('editable-area');
        c.onclick = function () { openStatsModal(myCharId, i); };
    });

    // 3. 무기 영역을 클릭하면 무기 수정창이 뜨도록 설정합니다.
    section.querySelectorAll('.weapon-display-wrapper').forEach(function (w, i) {
        w.classList.add('editable-area');
        w.onclick = function () { openWeaponModal(myCharId, i); };
    });

    // 4. 인벤토리를 클릭하면 인벤 수정창이 뜨도록 설정하고, 우편함 버튼도 달아줍니다.
    section.querySelectorAll('.rpg-inventory').forEach(function (inv, i) {
        inv.classList.add('editable-area');
        inv.onclick = function () { openInvModal(myCharId, i); };

        var headerWrap = inv.previousElementSibling;
        // 우편함 버튼이 아직 안 달려있다면 달아줍니다.
        if (headerWrap &&
            headerWrap.classList.contains('inv-header-wrapper') &&
            !headerWrap.querySelector('.open-mailbox-btn')) {
            var mBtn = document.createElement('button');
            mBtn.className = 'open-mailbox-btn';
            mBtn.innerHTML = '우편함 열기';
            mBtn.onclick = function (e) { 
                e.stopPropagation(); // 클릭했을 때 뒤에 있는 인벤토리 수정창까지 같이 열리는 걸 방지합니다.
                openMailboxModal(myCharId, i); 
            };
            headerWrap.appendChild(mBtn);
        }
    });
}


/* ─────────────────────────────────────────────────────────────────
   3. DB 저장 도우미 (Upsert 헬퍼)
───────────────────────────────────────────────────────────────── */
// Upsert는 '데이터가 이미 있으면 수정(Update)하고, 없으면 새로 만든다(Insert)'는 뜻입니다.
async function upsertProfileData(updates) {
    if (!supabaseClient || !currentEditingId) return { error: 'no client or id' };
    try {
        // 먼저 데이터가 이미 있는지 조회해봅니다.
        var sel = await supabaseClient
            .from('character_profiles')
            .select('char_id')
            .eq('char_id', currentEditingId)
            .eq('phase', currentEditingPhase);

        if (sel.data && sel.data.length > 0) {
            // 데이터가 있으면 수정합니다.
            return await supabaseClient
                .from('character_profiles')
                .update(updates)
                .eq('char_id', currentEditingId)
                .eq('phase', currentEditingPhase);
        } else {
            // 데이터가 없으면 새로 덮어쓰기 위해 합쳐서 저장합니다.
            var row = Object.assign({}, updates, { char_id: currentEditingId, phase: currentEditingPhase });
            return await supabaseClient.from('character_profiles').insert([row]);
        }
    } catch (e) {
        console.error('upsertProfileData error:', e);
        return { error: e };
    }
}


/* ─────────────────────────────────────────────────────────────────
   4. 전체 캐릭터 데이터 화면에 불러오기
───────────────────────────────────────────────────────────────── */
// 화면이 켜지면 데이터베이스에서 모든 캐릭터의 글, 스탯, 아이템 등을 가져와 화면에 씌우는 함수입니다.
async function loadCharacterData() {
    if (!supabaseClient) return;

    var fetched;
    try {
        fetched = await supabaseClient.from('character_profiles').select('*'); // 모든 프로필 정보 가져오기
    } catch (e) { console.error('loadCharacterData fetch error:', e); return; }
    if (fetched.error) { console.error('loadCharacterData DB error:', fetched.error); return; }

    allProfiles = fetched.data || [];

    // 가져온 캐릭터 데이터를 하나하나 돌면서 화면에 끼워 넣습니다.
    allProfiles.forEach(function (profile) {
        var section = document.getElementById(profile.char_id);
        if (!section) return;

        var phaseIdx    = profile.phase || 0;
        var targetSlide = section.querySelectorAll('.phase-slide')[phaseIdx];
        if (!targetSlide) return;

        // 1. 프로필 이미지 교체
        var profImg = targetSlide.querySelector('.main-profile-img');
        if (profImg && profile.profile_image) profImg.src = profile.profile_image;

        // 2. 한마디(대사) 교체
        var quoteTxt = targetSlide.querySelector('.quote-text');
        if (quoteTxt && profile.quote) quoteTxt.innerText = profile.quote;

        // 3. 직업, 나이, 거주지 같은 기본 정보 교체
        var infoValues = targetSlide.querySelectorAll('.info-value');
        if (infoValues.length >= 4) {
            infoValues[1].innerText = profile.job       || '?';
            infoValues[2].innerText = profile.age       || '?';
            infoValues[3].innerText = profile.residence || '?';
        }

        // 4. 백스토리 텍스트 교체
        var intro = targetSlide.querySelector('.section-intro');
        if (intro && profile.backstory) intro.innerText = profile.backstory;

        // 5. 능력치(스탯) 정보 갱신 및 차트 색상 교체
        var sw = targetSlide.querySelector('.stats-wrapper');
        if (sw) {
            if (profile.stats)       sw.setAttribute('data-stats', profile.stats);
            if (profile.chart_color) sw.setAttribute('data-color', profile.chart_color);
        }

        // 6. 소지금(돈) 표시 갱신
        var moneyDisplay = targetSlide.querySelector('.money-display');
        if (moneyDisplay) {
            moneyDisplay.innerText = (profile.money ? parseInt(profile.money) : 0).toLocaleString() + ' G';
        }

        // 7. 무기 목록 갱신
        var wpnWrapper = targetSlide.querySelector('.weapon-display-wrapper');
        if (wpnWrapper) {
            var wData = profile.weapon_data || '{}';
            wpnWrapper.setAttribute('data-weapon', wData);

            var parsed = { brawl: 50, weapons: [] };
            try {
                if (wData.startsWith('{')) {
                    var tmp      = JSON.parse(wData);
                    parsed.brawl   = tmp.brawl   || 50;
                    parsed.weapons = tmp.weapons  || [];
                } else {
                    var parts  = wData.split('|');
                    parsed.brawl = parseInt(parts[1]) || 50;
                    if (parts[0] && parts[0] !== '무기 없음') {
                        parsed.weapons.push({ name: parts[0], dmg: '1d3', desc: parts[2] || '' });
                    }
                }
            } catch (e) {}

            var brawlEl = wpnWrapper.querySelector('.wpn-brawl-display');
            if (brawlEl) brawlEl.innerText = '근접 격투: ' + parsed.brawl;

            var wcl = wpnWrapper.querySelector('.weapon-content-list');
            if (wcl) {
                if (!parsed.weapons.length) {
                    wcl.innerHTML = '<div style="background:rgba(0,0,0,0.4);padding:10px;border-radius:8px;border:1px solid rgba(215,179,61,0.2);text-align:center;color:#aaa;font-size:0.9rem;">장착된 무기가 없습니다.</div>';
                } else {
                    // 무기 개수만큼 HTML 블록을 찍어냅니다.
                    wcl.innerHTML = parsed.weapons.map(function (w) {
                        return '<div style="background:rgba(0,0,0,0.4);padding:10px;border-radius:8px;border:1px solid rgba(215,179,61,0.2);text-align:left;">' +
                            '<div style="display:flex;justify-content:space-between;margin-bottom:5px;">' +
                            '<strong style="color:var(--accent-color);">' + w.name + '</strong>' +
                            '<span style="color:#ff4d4d;font-size:0.85rem;font-weight:bold;">[' + w.dmg + ']</span>' +
                            '</div>' +
                            '<div style="color:#aaa;font-size:0.85rem;line-height:1.4;">' + (w.desc || '') + '</div>' +
                            '</div>';
                    }).join('');
                }
            }
        }

        // 8. 인벤토리 데이터 문자열로 변환 후 보관 (이후 패치 파일이 받아서 화면에 그립니다)
        var invWrapper = targetSlide.querySelector('.rpg-inventory');
        if (invWrapper) {
            var raw = profile.inventory;
            var safeString = typeof raw === 'object' ? JSON.stringify(raw) : (raw || '');
            invWrapper.setAttribute('data-inventory', safeString);
        }

        // 9. 관계도에 표시되는 동그란 프로필 얼굴 이미지 갱신
        var mapPhase = (typeof currentMapPhase !== 'undefined') ? currentMapPhase : 0;
        if (profile.phase === mapPhase && profile.profile_image) {
            var nodeImg = document.querySelector('#map-node-' + profile.char_id.replace('char-', '') + ' img');
            if (nodeImg) nodeImg.src = profile.profile_image;
        }
    });

    // 모든 데이터를 입혔으니 레이더 차트를 다시 그려서 갱신합니다. (조금 늦게 실행되게 0.1초 기다립니다)
    setTimeout(function () {
        if (typeof window.drawAllRadarCharts === 'function') window.drawAllRadarCharts();
    }, 100);
}


/* ─────────────────────────────────────────────────────────────────
   5. 이미지 업로드 유틸 (ImgBB)
───────────────────────────────────────────────────────────────── */
// 사용자가 첨부한 이미지를 ImgBB라는 외부 서버에 올리고 인터넷 주소(URL)를 받아오는 함수입니다.
async function uploadToImgbb(file) {
    var formData = new FormData();
    formData.append('image', file);
    try {
        var response = await fetch('https://api.imgbb.com/1/upload?key=' + IMGBB_API_KEY, { method: 'POST', body: formData });
        var result   = await response.json();
        return result.success ? result.data.url : null; // 성공하면 주소를 반환합니다.
    } catch (e) {
        console.error('imgbb 업로드 실패:', e);
        return null;
    }
}


/* ─────────────────────────────────────────────────────────────────
   6. 색상 변환 유틸
───────────────────────────────────────────────────────────────── */
// HEX 색상코드(#FFFFFF)를 RGB 숫자(255, 255, 255)로 바꿔주는 함수입니다.
function hexToRgb(hex) {
    var r = parseInt(hex.slice(1, 3), 16);
    var g = parseInt(hex.slice(3, 5), 16);
    var b = parseInt(hex.slice(5, 7), 16);
    return r + ', ' + g + ', ' + b;
}

// 반대로 RGB 숫자(255, 255, 255)를 HEX 색상코드(#FFFFFF)로 바꿔주는 함수입니다.
function rgbToHex(rgbStr) {
    var parts = rgbStr.split(',').map(function (x) { return parseInt(x.trim()); });
    return '#' + (1 << 24 | parts[0] << 16 | parts[1] << 8 | parts[2]).toString(16).slice(1);
}