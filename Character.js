/* ================================================================= */
/*  Character.js — 캐릭터 페이지 & 모달 (JSON / 20칸 최적화 버전)      */
/* ================================================================= */

// ─────────────────────────────────────────────────────────────────
// 1. 캐릭터 페이지 빌더 (레이아웃 좌우 대칭 & 정렬 완벽 교정판)
// ─────────────────────────────────────────────────────────────────
/* ================================================================= */

// ─────────────────────────────────────────────────────────────────
// 1. 캐릭터 페이지 화면 그리기 (레이아웃 설정)
// ─────────────────────────────────────────────────────────────────
// 설정 파일(Config.js)에 있는 캐릭터 데이터(charData)를 불러와서 HTML 코드로 만들어주는 함수입니다.
window.addEventListener('DOMContentLoaded', function() {
    initCharacterPages();
    // 레이더 차트를 정중앙에 예쁘게 배치하기 위한 CSS 스타일을 추가합니다.
    var html = '<style>.stats-wrapper > *:not(.weapon-section):not(.inventory-section) { grid-column: 1; grid-row: 1; justify-self: center; align-self: center; margin-top:10px; }</style>';
    
    // charData 배열에 있는 캐릭터 수만큼 반복해서 화면을 만듭니다. (4명이면 4번 반복)
    charData.forEach(function (c) {
        var slides = '';
        // 1부부터 4부까지 총 4개의 탭(슬라이드)을 만듭니다.
        for (var i = 0; i < 4; i++) {
            slides +=
                '<div class="phase-slide ' + (i === 0 ? 'active' : '') + '">' +
                    // 캐릭터 이름과 상단 버튼 영역
                    // ★ 시트 버튼: Config.js의 charData에서 sheetUrl 값을 링크로 사용합니다.
                    //   예) sheetUrl: 'https://ccfolia.com/rooms/...' 로 바꾸면 바로 연결됩니다.
                    //   '#'으로 두면 링크 없이 버튼만 표시됩니다.
                    '<div class="char-header-row"><h2>' + c.title + '</h2>' +
                    '<a href="' + (c.sheetUrl || '#') + '" class="link-btn" ' +
                       'target="' + (c.sheetUrl && c.sheetUrl !== '#' ? '_blank' : '_self') + '" ' +
                       'rel="noopener" title="캐릭터 시트 열기">시트</a></div>' +
                    // 프로필 사진과 기본 정보가 들어가는 영역
                    '<div class="profile-overview">' +
                        '<img src="' + c.img + '" class="main-profile-img" onclick="openLightbox(this.src)">' +
                        '<div class="profile-info-wrapper">' +
                            '<div class="char-quote">' +
                                '<span class="quote-mark" style="color:rgb(' + c.color + ');">"</span>' +
                                '<p class="quote-text">' + c.quote + '</p>' +
                            '</div>' +
                            '<div class="divider-dots">• • •</div>' +
                            '<div class="info-table">' +
                                '<div class="info-row"><span class="info-label">이름</span><span class="info-value">' + c.name + '</span></div>' +
                                '<div class="info-row"><span class="info-label">직업</span><span class="info-value">?</span></div>' +
                                '<div class="info-row"><span class="info-label">나이</span><span class="info-value">?</span></div>' +
                                '<div class="info-row"><span class="info-label">거주지</span><span class="info-value">?</span></div>' +
                                '<div class="info-row money-row"><span class="info-label">소지금</span><span class="info-value money-display">0 G</span></div>' +
                            '</div>' +
                        '</div>' +
                    '</div>' +
                    '<div class="divider-dots">• • •</div>' +
                    
                    // 능력치 레이더 차트, 무기, 인벤토리가 들어가는 커다란 그리드(표) 영역입니다.
                    '<div class="stats-wrapper" data-stats="' + c.stats + '" data-color="' + c.color + '" style="display:grid; grid-template-columns: 1fr 1fr; grid-template-rows: auto auto; gap:10px 40px; align-items:start; justify-items:center;">' +
                        
                        // 무기 목록을 보여주는 영역
                        '<div class="weapon-section" style="grid-column: 2; grid-row: 1; width:100%; justify-self:stretch;">' +
                            '<div class="weapon-display-wrapper" data-weapon="{}">' +
                                '<div class="inv-header-wrapper" style="margin-bottom:12px;display:flex;justify-content:space-between;align-items:center;">' +
                                    '<h3 style="margin:0; font-family:\'Nanum Myeongjo\', serif; color:var(--accent-color);">Weapon &amp; Combat</h3>' +
                                    '<span class="wpn-brawl-display" style="background:rgba(215,179,61,0.1); border:1px solid rgba(215,179,61,0.4); padding:4px 12px; border-radius:20px; font-size:0.85rem; color:#d7b33d; font-weight:bold;">근접 격투: 50</span>' +
                                '</div>' +
                                '<div class="weapon-content-list" style="display:flex;flex-direction:column;gap:8px;cursor:pointer;">' +
                                    '<div style="background:rgba(0,0,0,0.3);padding:15px;border-radius:12px;border:1px dashed rgba(215,179,61,0.3);text-align:center;color:#aaa;font-size:0.9rem;">장착된 무기가 없습니다.</div>' +
                                '</div>' +
                            '</div>' +
                        '</div>' +
                        
                        // 인벤토리(가방) 영역
                        '<div class="inventory-section" style="grid-column: 1 / -1; grid-row: 2; width:100%; justify-self:stretch; margin-top:25px;">' +
                            '<div class="inv-header-inventory" style="margin-bottom:15px;">' +
                                '<div style="display:flex; align-items:center; justify-content:space-between; width:100%; gap:10px;">' +
                                    '<h3 style="margin:0; letter-spacing:1px; font-size:1.1rem; font-family:\'Nanum Myeongjo\', serif; color:var(--accent-color); white-space:nowrap;">Inventory</h3>' +
                                    // 소지품/보관함 탭이 들어갈 빈 공간
                                    '<div class="inv-tab-slot" style="display:flex; flex:1; max-width:180px; min-width:140px; background:rgba(10,10,10,0.8); border:1px solid rgba(215,179,61,0.5); border-radius:24px; padding:4px;"></div>' +
                                    // 우편함 버튼 (클릭하면 openMailboxModal 함수가 실행됨)
                                    '<button class="inv-mailbox-btn auth-btn" style="width:auto; margin:0; padding:6px 14px; font-size:0.75rem; border-radius:20px; white-space:nowrap; background:#2a2826; border:1px solid rgba(215,179,61,0.3); color:#e5c56d; box-shadow:0 2px 4px rgba(0,0,0,0.3);" onclick="openMailboxModal(\'char-' + c.id + '\',' + i + ')">우편함</button>' +
                                '</div>' +
                            '</div>' +
                            '<div class="rpg-inventory"></div>' +
                        '</div>' +
                        
                    '</div>' +
                    '<div class="divider-dots">• • •</div>' +
                    // 백스토리 영역
                    '<h2>백스토리</h2>' +
                    '<p class="section-intro">개요 텍스트</p>' +
                    '<details><summary>분기점 1</summary><div class="details-content">내용</div></details>' +
                '</div>';
        }
        
        // 만들어진 4개의 슬라이드를 하나의 섹션으로 묶어줍니다.
        html +=
            '<section id="char-' + c.id + '" class="content-card">' +
                // 1부~4부 탭 버튼들
                '<div class="phase-tabs">' +
                    '<button class="phase-btn active" onclick="changePhase(this, 0)">1부</button>' +
                    '<button class="phase-btn"        onclick="changePhase(this, 1)">2부</button>' +
                    '<button class="phase-btn"        onclick="changePhase(this, 2)">3부</button>' +
                    '<button class="phase-btn"        onclick="changePhase(this, 3)">4부</button>' +
                '</div>' +
                '<div class="phase-content-wrapper">' + slides + '</div>' +
            '</section>';
    });
    
    // 최종적으로 완성된 HTML 덩어리를 웹페이지의 'character-pages-container' 위치에 쏙 집어넣습니다.
    document.getElementById('character-pages-container').innerHTML = html;
    
    // 화면 그리기가 끝났으니 레이더 차트를 그리는 함수를 실행시킵니다.
    if (typeof drawAllRadarCharts === 'function') drawAllRadarCharts();
    
    if (typeof window.refreshInventoryPreviews === 'function') window.refreshInventoryPreviews();
}

// 화면에 보여지는 기본 인벤토리를 20칸의 빈 칸으로 채워주는 함수입니다.
function initDefaultInventories() {
    document.querySelectorAll('.rpg-inventory').forEach(function (inv) {
        // 인벤토리 칸이 20개가 될 때까지 빈 HTML 태그를 추가합니다.
        while (inv.querySelectorAll('.inv-slot').length < 20)
            inv.insertAdjacentHTML('beforeend', '<div class="inv-slot"></div>');
    });
}

// ─────────────────────────────────────────────────────────────────
// 2. 기본 정보 수정 팝업(모달) 관련 기능
// ─────────────────────────────────────────────────────────────────
// 연필 아이콘을 누르면 기본 정보를 수정하는 팝업창을 띄우는 함수입니다.
window.openGeneralModal = function (charId, phaseIndex) {
    // 본인의 캐릭터인지 확인합니다. (권한 체크)
    var myCharId = currentUser ? charOwners[currentUser.email] : null;
    if (myCharId !== charId) return alert('본인의 캐릭터 정보만 수정할 수 있습니다.');
    
    // 지금 수정하고 있는 캐릭터 아이디와 탭 번호를 기억해둡니다.
    currentEditingId    = charId;
    currentEditingPhase = phaseIndex;

    // 현재 화면에 적혀있는 값들을 읽어와서 팝업창의 입력칸에 미리 채워 넣습니다.
    var targetSlide = document.getElementById(charId).querySelectorAll('.phase-slide')[phaseIndex];
    var iv = targetSlide.querySelectorAll('.info-value');
    document.getElementById('edit-modal-title').innerText  = iv[0].innerText + ' 정보 수정';
    document.getElementById('current-profile-img').value   = targetSlide.querySelector('.main-profile-img').src;
    document.getElementById('edit-quote').value            = targetSlide.querySelector('.quote-text').innerText;
    // '?'나 '여기에' 같은 기본 안내 문구는 깔끔하게 지워줍니다.
    document.getElementById('edit-job').value              = iv[1].innerText.replace(/\?|여기에/, '');
    document.getElementById('edit-age').value              = iv[2].innerText.replace(/\?|여기에/, '');
    document.getElementById('edit-residence').value        = iv[3].innerText.replace(/\?|여기에/, '');
    document.getElementById('edit-backstory').value        = targetSlide.querySelector('.section-intro').innerText;
    
    var currentRgb = targetSlide.querySelector('.stats-wrapper').getAttribute('data-color') || '147, 223, 60';
    document.getElementById('edit-theme-color').value = rgbToHex(currentRgb);
    
    // 모달창을 눈에 보이게 합니다 ('show' 클래스 추가)
    document.getElementById('edit-modal').classList.add('show');
};

// 팝업창에서 '기록하기' 버튼을 눌렀을 때 데이터를 저장하는 함수입니다. (async/await은 저장이 끝날 때까지 기다리라는 의미입니다)
window.saveGeneralData = async function () {
    var btn = document.getElementById('save-btn');
    btn.innerText = '저장 중...'; btn.disabled = true; // 저장하는 동안 버튼을 막아둡니다.

    var finalImg  = document.getElementById('current-profile-img').value;
    var fileInput = document.getElementById('edit-profile-file');
    
    // 사용자가 새 프로필 사진을 선택했다면 이미지 서버에 먼저 업로드합니다.
    if (fileInput.files.length > 0) {
        btn.innerText = '외부 전송 중...';
        var uploadedUrl = await uploadToImgbb(fileInput.files[0]);
        if (uploadedUrl) finalImg = uploadedUrl;
        else             alert('이미지 업로드에 실패했습니다.');
    }
    
    var hexColor = document.getElementById('edit-theme-color').value;
    
    // 데이터베이스에 저장할 정보들을 묶어서 전송합니다.
    var res = await upsertProfileData({
        profile_image: finalImg,
        quote:         document.getElementById('edit-quote').value,
        job:           document.getElementById('edit-job').value,
        age:           document.getElementById('edit-age').value,
        residence:     document.getElementById('edit-residence').value,
        backstory:     document.getElementById('edit-backstory').value,
        chart_color:   hexToRgb(hexColor) // 색상 코드를 변환해서 저장
    });
    
    btn.innerText = '기본 정보 기록하기'; btn.disabled = false;
    
    if (res && res.error) alert('저장 실패');
    else { 
        await loadCharacterData(); // 저장 성공 시 화면을 새로고침합니다.
        closeModal('edit-modal');  // 모달창을 닫습니다.
    }
};

// ─────────────────────────────────────────────────────────────────
// 3. 능력치 수정 팝업 관련 기능
// ─────────────────────────────────────────────────────────────────
// 레이더 차트를 클릭하면 능력치를 숫자로 수정할 수 있는 팝업을 띄웁니다.
window.openStatsModal = function (charId, phaseIndex) {
    currentEditingId    = charId;
    currentEditingPhase = phaseIndex;
    
    // 현재 캐릭터의 능력치 숫자들을 콤마(,)를 기준으로 잘라서 배열로 만듭니다.
    var statsStr = document.getElementById(charId)
        .querySelectorAll('.phase-slide')[phaseIndex]
        .querySelector('.stats-wrapper').getAttribute('data-stats') || '50,50,50,50,50,50,50,50';
    var stats = statsStr.split(',').map(Number);

    var h = '';
    // 8개의 능력치 입력칸을 만듭니다.
    for (var i = 0; i < 8; i++) {
        h += '<div style="display:flex;justify-content:space-between;align-items:center;">' +
            '<span style="color:var(--accent-color);font-weight:bold;">' + (typeof STAT_LABELS !== 'undefined' ? STAT_LABELS[i] : '능력치 ' + (i+1)) + '</span>' +
            '<input type="number" id="stat-input-' + i + '" value="' + (stats[i] || 50) + '" class="modal-inline-input" style="width:60px;text-align:center;">' +
            '</div>';
    }
    document.getElementById('stats-inputs-container').innerHTML = h;
    document.getElementById('stats-modal').classList.add('show');
};

// 수정된 능력치를 데이터베이스에 저장합니다.
window.saveStatsToDB = async function () {
    var btn = document.getElementById('stats-save-btn');
    btn.innerText = '적용 중...'; btn.disabled = true;
    
    var arr = [];
    // 8개의 입력칸에서 숫자를 읽어와서 배열에 담습니다.
    for (var i = 0; i < 8; i++) arr.push(document.getElementById('stat-input-' + i).value || 50);
    
    // 배열을 다시 콤마(,)로 연결된 문자열로 만들어서 저장합니다.
    var res = await upsertProfileData({ stats: arr.join(',') });
    
    btn.innerText = '능력치 적용'; btn.disabled = false;
    
    if (res && res.error) alert('저장 실패');
    else { 
        await loadCharacterData(); 
        closeModal('stats-modal'); 
    }
    // 데이터가 바뀌었으니 레이더 차트를 다시 그리라고 명령합니다.
    if (typeof window.drawAllRadarCharts === 'function') window.drawAllRadarCharts();
};

// ─────────────────────────────────────────────────────────────────
// 4. 무기 및 전투 스탯 수정 팝업 관련 기능
// ─────────────────────────────────────────────────────────────────
// 무기 팝업창에서 '무기 추가' 버튼을 눌렀을 때 입력칸을 한 줄 생성해주는 함수입니다.
window.addWeaponRow = function (name, dmg, type, desc) {
    name = name || ''; dmg = dmg || ''; type = type || 'brawl'; desc = desc || '';
    var container = document.getElementById('weapon-list-container');
    var row = document.createElement('div');
    row.className = 'weapon-row';
    row.style.cssText = 'background:#0a0908;padding:15px;border-radius:8px;border:1px solid #2a2520;margin-bottom:12px;display:flex;flex-direction:column;gap:10px;';
    
    row.innerHTML =
        '<div style="display:flex;gap:10px;align-items:center;">' +
            '<input type="text" class="auth-input wp-name" placeholder="무기명 (예: 가나다검)" value="' + name + '" style="margin:0;padding:10px;flex:2;background:#12100e;border:1px solid #222;color:#fff;border-radius:6px;font-weight:bold;">' +
            '<input type="text" class="auth-input wp-dmg"  placeholder="1d8+2" value="' + dmg  + '" style="margin:0;padding:10px;flex:1;background:#12100e;border:1px solid #222;color:#ff4d4d;font-weight:bold;text-align:center;border-radius:6px;">' +
            '<select class="auth-input wp-type" style="margin:0;padding:10px;flex:1.2;background:#12100e;border:1px solid #222;color:#fff;border-radius:6px;cursor:pointer;">' +
                '<option value="brawl"' + (type === 'brawl' ? ' selected' : '') + '>격투</option>' +
                '<option value="sword"' + (type === 'sword' ? ' selected' : '') + '>도검</option>' +
                '<option value="bow"'   + (type === 'bow'   ? ' selected' : '') + '>활</option>' +
                '<option value="throw"' + (type === 'throw' ? ' selected' : '') + '>투척</option>' +
                '<option value="magic"' + (type === 'magic' ? ' selected' : '') + '>마법</option>' +
            '</select>' +
            // 삭제 버튼: 클릭하면 이 무기 줄이 화면에서 지워집니다.
            '<button style="background:#4a1c1c;color:#ff9999;border:1px solid #6a2c2c;padding:10px 15px;border-radius:6px;cursor:pointer;font-weight:bold;white-space:nowrap;" onclick="this.closest(\'.weapon-row\').remove()">삭제</button>' +
        '</div>' +
        '<input type="text" class="auth-input wp-desc" placeholder="무기 설명 및 외형 (선택)" value="' + desc + '" style="margin:0;padding:10px;width:100%;box-sizing:border-box;font-size:0.85rem;color:#888;background:#12100e;border:1px solid #222;border-radius:6px;">';
    container.appendChild(row);
};

// 무기 영역을 클릭했을 때 팝업창을 엽니다.
window.openWeaponModal = async function (charId, phaseIndex) {
    if (!currentUser) return alert('로그인이 필요합니다.');
    var myCharId = charOwners[currentUser.email];
    if (myCharId !== charId) return alert('본인 캐릭터만 수정할 수 있습니다.');
    currentEditingId    = charId;
    currentEditingPhase = phaseIndex;

    // 데이터베이스에서 이 캐릭터의 무기 데이터만 콕 집어서 가져옵니다.
    var res = await supabaseClient
        .from('character_profiles').select('weapon_data')
        .eq('char_id', charId).eq('phase', phaseIndex).single();

    // 이전에 띄워져 있던 무기 목록과 입력칸들을 싹 비워줍니다. (초기화)
    document.getElementById('weapon-list-container').innerHTML = '';
    ['edit-brawl-stat','edit-sword-stat','edit-bow-stat','edit-throw-stat',
     'edit-magic-stat','edit-dodge-stat','edit-drive-stat','edit-bp-stat'].forEach(function (id) {
        var el = document.getElementById(id); if (el) el.value = '';
    });

    // 가져온 데이터가 있다면, 분석해서 화면에 채워 넣습니다.
    if (res.data && res.data.weapon_data) {
        try {
            // JSON은 복잡한 구조를 문자열로 저장하는 방식입니다. 이를 자바스크립트 객체로 변환(parse)합니다.
            var w = typeof res.data.weapon_data === 'string'
                ? JSON.parse(res.data.weapon_data) : res.data.weapon_data;
            
            var setVal = function (id, val) { var el = document.getElementById(id); if (el && val !== undefined) el.value = val; };
            setVal('edit-brawl-stat', w.brawl);
            setVal('edit-sword-stat', w.sword);
            setVal('edit-bow-stat',   w.bow);
            setVal('edit-throw-stat', w.throw);
            setVal('edit-magic-stat', w.magic);
            setVal('edit-dodge-stat', w.dodge);
            setVal('edit-drive-stat', w.drive);
            setVal('edit-bp-stat',    w.bp);
            
            // 무기 배열에 있는 무기들을 하나씩 화면에 생성합니다.
            (w.weapons || []).forEach(function (wp) {
                window.addWeaponRow(wp.name, wp.dmg, wp.type || 'brawl', wp.desc || '');
            });
        } catch (e) { console.warn('weapon_data 파싱 오류', e); }
    }
    document.getElementById('weapon-modal').classList.add('show');
};

// 수정된 무기 및 스탯 정보를 데이터베이스에 저장합니다.
window.saveWeaponData = async function () {
    if (!currentUser) return alert('로그인이 필요합니다.');
    var charId = charOwners[currentUser.email];
    if (!charId) return alert('권한 없음');

    var btn = document.querySelector('#weapon-modal .auth-btn[onclick="saveWeaponData()"]');
    if (btn) { btn.innerText = '저장 중...'; btn.disabled = true; }

    // 입력칸의 아이디를 주면 그 안의 숫자를 가져오는 작은 도우미 함수입니다.
    var getNum = function (id) {
        var el = document.getElementById(id);
        return (el && el.value) ? parseInt(el.value) || 0 : 0;
    };
    
    var brawl  = getNum('edit-brawl-stat') || 25;
    var sword  = getNum('edit-sword-stat') || 25;
    var bow    = getNum('edit-bow-stat')   || 25;
    var throw_ = getNum('edit-throw-stat') || 20;
    var magic  = getNum('edit-magic-stat') || 15;
    var dodge  = getNum('edit-dodge-stat');
    var drive  = getNum('edit-drive-stat') || 20;
    var bp     = getNum('edit-bp-stat');

    var weapons = [];
    // 화면에 있는 모든 무기 줄(.weapon-row)을 찾아서 데이터를 수집합니다.
    document.querySelectorAll('.weapon-row').forEach(function (row) {
        var name = (row.querySelector('.wp-name') || {}).value || '';
        var dmg  = (row.querySelector('.wp-dmg')  || {}).value || '1d3';
        var type = (row.querySelector('.wp-type') || {}).value || 'brawl';
        var desc = (row.querySelector('.wp-desc') || {}).value || '';
        // 이름이 비어있지 않은 무기만 배열에 추가합니다.
        if (name.trim()) weapons.push({ name: name.trim(), dmg: dmg, type: type, desc: desc });
    });

    // 모든 데이터를 하나의 객체로 묶고, 저장하기 위해 문자열(JSON)로 변환합니다.
    var payload = JSON.stringify({ brawl: brawl, sword: sword, bow: bow, throw: throw_, magic: magic, dodge: dodge, drive: drive, bp: bp, weapons: weapons });
    var res = await upsertProfileData({ weapon_data: payload });

    if (btn) { btn.innerText = '무기 및 스탯 기록하기'; btn.disabled = false; }
    if (res && res.error) alert('저장 실패: ' + res.error.message);
    else { await loadCharacterData(); closeModal('weapon-modal'); }
};

// ─────────────────────────────────────────────────────────────────
// 5. 인벤토리(가방) 팝업 관련 기능
// ─────────────────────────────────────────────────────────────────
// 이 변수들은 인벤토리의 현재 상태를 기억하는 메모장 같은 역할을 합니다.
var _currentInvTab      = 'general';  // 현재 보고 있는 탭 (소지품인지 보관함인지)
var _invRawGeneral      = [];         // 데이터베이스에서 가져온 진짜 소지품 원본
var _invRawFurniture    = [];         // 데이터베이스에서 가져온 진짜 보관함 원본

// 모달창 안에서 '소지품' 혹은 '보관함' 탭을 눌렀을 때 화면을 바꿔주는 함수입니다.
window.changeInvTab = function (tabName) {
    _currentInvTab = tabName;
    
    // 모든 탭 버튼에서 불을 끄고, 눌린 버튼에만 불을 켭니다(active 클래스 추가).
    var tabs = document.querySelectorAll('#inv-tabs .phase-btn');
    tabs.forEach(function (t) { t.classList.remove('active'); });
    var activeBtn = document.querySelector('#inv-tabs .phase-btn[onclick="changeInvTab(\'' + tabName + '\')"]');
    if (activeBtn) activeBtn.classList.add('active');

    // 사용자가 선택한 탭에 맞는 원본 데이터를 가져옵니다.
    var src = (tabName === 'furniture') ? _invRawFurniture : _invRawGeneral;
    currentInvData = [];
    
    // 가져온 데이터를 20칸짜리 배열에 맞게 정리합니다. 빈칸은 null로 채웁니다.
    for (var i = 0; i < 20; i++) {
        var item = src[i];
        if (!item || (typeof item === 'string' && item.indexOf('[object') !== -1)) {
            currentInvData.push(null);
        } else if (typeof item === 'object' && item.name) {
            currentInvData.push(item);
        } else if (typeof item === 'string' && item.indexOf(':') !== -1) {
            var p = item.split(':');
            currentInvData.push({ name: p[0], desc: p[1] || '', img: p.slice(2).join(':'), count: 1 });
        } else {
            currentInvData.push(null);
        }
    }

    currentSlotIndex = -1; // 선택된 칸 초기화
    renderInvModalGrid();  // 20칸의 그리드를 다시 그립니다.
    document.getElementById('inv-slot-form').style.display = 'none'; // 하단 편집창 숨김
};

// 인벤토리 영역을 클릭했을 때 모달창을 엽니다.
window.openInvModal = async function (charId, phaseIndex) {
    currentEditingId    = charId;
    currentEditingPhase = phaseIndex;

    // 데이터베이스에서 소지품(inventory)과 보관함(furniture_inventory) 정보를 가져옵니다.
    var res = await supabaseClient
        .from('character_profiles')
        .select('inventory, furniture_inventory')
        .eq('char_id', charId).eq('phase', phaseIndex).single();

    var profile = res.data || null;

    // 가져온 소지품 정보를 자바스크립트 배열로 안전하게 변환합니다.
    var rawG = (profile && profile.inventory) ? profile.inventory : [];
    if (typeof rawG === 'string') { try { rawG = JSON.parse(rawG); } catch(e) { rawG = []; } }
    if (!Array.isArray(rawG)) rawG = [];
    _invRawGeneral = rawG;

    // 가져온 보관함 정보도 배열로 변환합니다.
    var rawF = (profile && profile.furniture_inventory) ? profile.furniture_inventory : [];
    if (typeof rawF === 'string') { try { rawF = JSON.parse(rawF); } catch(e) { rawF = []; } }
    if (!Array.isArray(rawF)) rawF = [];
    _invRawFurniture = rawF;

    // 모달을 처음 열 때는 기본으로 '소지품' 탭을 보여줍니다.
    _currentInvTab = 'general';
    var tabs = document.querySelectorAll('#inv-tabs .phase-btn');
    tabs.forEach(function (t, idx) { t.classList.toggle('active', idx === 0); });

    // 20칸 배열을 만들어서 데이터를 채워줍니다.
    currentInvData = [];
    for (var i = 0; i < 20; i++) {
        var item = rawG[i];
        if (!item || (typeof item === 'string' && item.indexOf('[object') !== -1)) {
            currentInvData.push(null);
        } else if (typeof item === 'object' && item.name) {
            currentInvData.push(item);
        } else if (typeof item === 'string' && item.indexOf(':') !== -1) {
            var p = item.split(':');
            currentInvData.push({ name: p[0], desc: p[1] || '', img: p.slice(2).join(':'), count: 1 });
        } else {
            currentInvData.push(null);
        }
    }

    currentSlotIndex = -1;
    document.getElementById('inv-slot-form').style.display = 'none';
    renderInvModalGrid();
    document.getElementById('inv-modal').classList.add('show');
};

// 배열에 들어있는 아이템 정보를 바탕으로 20개의 네모 칸(그리드)을 화면에 그립니다.
function renderInvModalGrid() {
    var grid = document.getElementById('inv-modal-grid');
    if (!grid) return;
    grid.innerHTML = ''; // 기존 칸들을 싹 비웁니다.

    var PH = (typeof PLACEHOLDER_ITEM !== 'undefined') ? PLACEHOLDER_ITEM : 'https://placehold.co/100?text=No+Image';

    for (var i = 0; i < 20; i++) {
        var isSelected = (i === currentSlotIndex);
        // 사용자가 클릭한 칸이라면 하얀색 테두리로 강조(하이라이트)해줍니다.
        var hl = isSelected
            ? 'border:2px solid #fff;box-shadow:0 0 10px rgba(255,255,255,0.5);'
            : 'border:1px solid rgba(215,179,61,0.3);';

        var slotItem = currentInvData[i];
        var imgSrc   = PH;
        var name     = '';
        var desc     = '';
        var count    = 1;

        if (slotItem && slotItem.name) {
            name   = slotItem.name;
            desc   = slotItem.desc || '';
            imgSrc = slotItem.img  || PH;
            count  = parseInt(slotItem.count) || 1;
        }

        // 아이템 개수가 2개 이상이면 오른쪽 위에 조그맣게 'x2' 모양의 배지를 만듭니다.
        var countBadge = (name && count > 1)
            ? '<div style="position:absolute;top:2px;right:2px;background:#d7b33d;color:#000;font-size:12px;font-weight:bold;padding:2px 5px;border-radius:4px;z-index:99;box-shadow:0 0 3px #000;">x' + count + '</div>'
            : '';

        grid.innerHTML +=
            '<div class="inv-slot" style="cursor:pointer;width:70px!important;height:70px!important;position:relative;overflow:hidden;background:#222;' + hl + '" onclick="selectInvSlot(' + i + ')" title="' + desc + '">' +
            countBadge +
            '<img src="' + imgSrc + '" onerror="this.src=\'https://placehold.co/100?text=Error\'" style="width:100%;height:100%;object-fit:cover;position:absolute;top:0;left:0;z-index:1;">' +
            (name ? '<div style="position:absolute;bottom:0;left:0;width:100%;background:rgba(0,0,0,0.8);font-size:10px;color:#fff;text-align:center;padding:3px 0;z-index:10;">' + name + '</div>' : '') +
            '</div>';
    }
}

// 20칸 중 하나를 마우스로 클릭했을 때 실행되는 함수입니다.
window.selectInvSlot = function (index) {
    currentSlotIndex = index;
    renderInvModalGrid(); // 테두리를 갱신하기 위해 그리드를 다시 그립니다.
    
    // 클릭했으므로 하단의 아이템 편집 폼을 눈에 보이게 켭니다.
    document.getElementById('inv-slot-form').style.display = 'block';
    document.getElementById('inv-slot-title').innerText    = (index + 1) + '번 칸 편집';

    var nIn  = document.getElementById('inv-slot-name');
    var dIn  = document.getElementById('inv-slot-desc');
    var gBtn = document.getElementById('inv-gift-btn');
    var uBtn = document.getElementById('inv-use-btn');
    document.getElementById('inv-slot-file').value = '';

    // 클릭한 칸에 아이템이 이미 있다면, 편집창에 원래 정보를 채워줍니다.
    var item = currentInvData[index];
    if (item && item.name) {
        nIn.value = item.name || '';
        dIn.value = item.desc || '';
        if (gBtn) gBtn.style.display = 'inline-block';
        if (uBtn) uBtn.style.display = 'inline-block';
    } else {
        // 비어있는 칸이면 편집창도 비워둡니다.
        nIn.value = ''; dIn.value = '';
        if (gBtn) gBtn.style.display = 'none';
        if (uBtn) uBtn.style.display = 'none';
    }
};

// 하단 편집창에서 '적용' 버튼을 누르면 배열에 반영하는 함수입니다.
window.applyInvSlot = async function () {
    var nIn  = document.getElementById('inv-slot-name').value.trim();
    var dIn  = document.getElementById('inv-slot-desc').value.trim();
    var fIn  = document.getElementById('inv-slot-file');
    var btn  = document.getElementById('inv-apply-btn');
    var PH   = (typeof PLACEHOLDER_ITEM !== 'undefined') ? PLACEHOLDER_ITEM : 'https://placehold.co/100x100';
    var imgUrl = PH;

    var currentItem = currentInvData[currentSlotIndex];
    if (fIn.files.length === 0 && currentItem && currentItem.img) imgUrl = currentItem.img;

    if (fIn.files.length > 0) {
        btn.innerText = '외부 업로드...'; btn.disabled = true;
        var uploadedUrl = await uploadToImgbb(fIn.files[0]);
        if (uploadedUrl) imgUrl = uploadedUrl;
        btn.innerText = '적용'; btn.disabled = false;
    }

    // 배열의 해당 칸에 아이템 정보를 새로 덮어씌웁니다.
    currentInvData[currentSlotIndex] = {
        name:  nIn || '아이템',
        desc:  dIn,
        img:   imgUrl,
        count: (currentItem && currentItem.count) ? currentItem.count : 1,
        type:  (_currentInvTab === 'furniture') ? 'furniture' : 'general'
    };
    renderInvModalGrid();
};

// 하단 편집창에서 '모두 비우기' 버튼을 누르면 칸을 완전히 비우는 함수입니다.
window.deleteInvSlot = function () {
    if (confirm('칸을 비우시겠습니까?')) {
        currentInvData[currentSlotIndex] = null;
        renderInvModalGrid();
        
        document.getElementById('inv-slot-name').value = '';
        document.getElementById('inv-slot-desc').value = '';
        var gBtn = document.getElementById('inv-gift-btn');
        var uBtn = document.getElementById('inv-use-btn');
        if (gBtn) gBtn.style.display = 'none';
        if (uBtn) uBtn.style.display = 'none';
    }
};

// 하단 편집창에서 '1개 소모' 버튼을 누르면 개수를 줄이거나 아이템을 없애는 함수입니다.
window.useInvItemOne = async function () {
    if (currentSlotIndex < 0) return;
    var item = currentInvData[currentSlotIndex];
    if (!item || !item.name) return;
    if (!confirm('[' + item.name + '] 아이템을 1개 사용하시겠습니까?')) return;

    item.count = (parseInt(item.count) || 1) - 1;
    if (item.count <= 0) {
        // 아이템 개수가 0이 되면 배열에서 완전히 삭제(null) 처리합니다.
        currentInvData[currentSlotIndex] = null;
        currentSlotIndex = -1;
        document.getElementById('inv-slot-form').style.display = 'none';
        alert('아이템을 모두 소모했습니다.');
    } else {
        alert('아이템 1개를 소모했습니다.');
    }
    renderInvModalGrid();
};

// 변경된 배열(currentInvData)을 최종적으로 데이터베이스에 저장합니다.
window.saveInventoryToDB = async function () {
    var btn = document.getElementById('inv-save-btn');
    btn.innerText = '저장 중...'; btn.disabled = true;

    // 현재 열려있는 탭에 따라 데이터베이스의 어느 기둥(컬럼)에 저장할지 결정합니다.
    var colKey = (_currentInvTab === 'furniture') ? 'furniture_inventory' : 'inventory';
    var payload = {};
    payload[colKey] = currentInvData;

    var res = await upsertProfileData(payload);
    btn.innerText = '인벤토리 저장'; btn.disabled = false;
    
    if (res && res.error) alert('저장 실패');
    else { await loadCharacterData(); closeModal('inv-modal'); }
};

// ─────────────────────────────────────────────────────────────────
// 6. 우편함 (선물 주고 받기 기능)
// ─────────────────────────────────────────────────────────────────
// 다른 사람에게 아이템을 보낼 대상을 고르는 창을 엽니다.
window.openGiftModal = function () { document.getElementById('gift-modal').classList.add('show'); };

// 실제로 상대방의 우편함으로 아이템을 복사해 전송하는 함수입니다.
window.sendGift = async function () {
    var targetCharId = document.getElementById('gift-target').value;
    var btn = document.getElementById('send-gift-btn');
    if (targetCharId === currentEditingId) return alert('자신에게 보낼 수 없습니다.');

    var itemToGift = currentInvData[currentSlotIndex];
    if (!itemToGift) return alert('보낼 아이템이 없습니다.');

    btn.innerText = '발송 중...'; btn.disabled = true;
    try {
        // 1. 상대방의 현재 우편함(mailbox) 데이터를 가져옵니다.
        var fetchRes = await supabaseClient.from('character_profiles').select('mailbox')
            .eq('char_id', targetCharId).eq('phase', currentEditingPhase);

        var mb = [];
        if (fetchRes.data && fetchRes.data[0] && fetchRes.data[0].mailbox) {
            try { mb = JSON.parse(fetchRes.data[0].mailbox); } catch (e) { mb = []; }
        }
        if (!Array.isArray(mb)) mb = [];
        
        // 2. 우편함 배열에 내가 보낼 아이템을 쏙 넣어줍니다.
        mb.push(itemToGift);

        // 3. 상대방의 우편함 데이터를 업데이트해 저장합니다.
        if (fetchRes.data && fetchRes.data.length > 0) {
            await supabaseClient.from('character_profiles').update({ mailbox: mb })
                .eq('char_id', targetCharId).eq('phase', currentEditingPhase);
        } else {
            await supabaseClient.from('character_profiles')
                .insert([{ char_id: targetCharId, phase: currentEditingPhase, mailbox: mb }]);
        }

        // 4. 아이템을 보냈으니 내 가방에서는 지워줍니다.
        currentInvData[currentSlotIndex] = null;
        await upsertProfileData({ inventory: currentInvData });

        alert('우편이 발송되었습니다!');
        await loadCharacterData();
        closeModal('gift-modal');
        closeModal('inv-modal');
    } catch (err) {
        console.error(err);
        alert('발송 실패');
    }
    btn.innerText = '우편 발송하기'; btn.disabled = false;
};

// 나에게 온 우편함을 여는 함수입니다.
window.openMailboxModal = async function (charId, phaseIndex) {
    currentEditingId    = charId;
    currentEditingPhase = phaseIndex;
    document.getElementById('mailbox-modal').classList.add('show');
    document.getElementById('mailbox-list').innerHTML = '<p style="color:#ccc;text-align:center;">조회 중...</p>';

    // 데이터베이스에서 내 우편함 데이터를 가져옵니다.
    var res = await supabaseClient.from('character_profiles').select('mailbox')
        .eq('char_id', charId).eq('phase', phaseIndex);

    var parsedMb = [];
    if (res.data && res.data[0] && res.data[0].mailbox) {
        try { parsedMb = JSON.parse(res.data[0].mailbox); } catch (e) { parsedMb = []; }
        if (typeof res.data[0].mailbox === 'string' &&
            res.data[0].mailbox.indexOf(':') !== -1 &&
            res.data[0].mailbox.indexOf('[') === -1) {
            parsedMb = res.data[0].mailbox.split(',').filter(Boolean);
        }
    }
    currentMailboxData = Array.isArray(parsedMb) ? parsedMb : [];
    renderMailboxList(); // 가져온 우편들을 리스트로 그립니다.
};

// 우편함의 아이템들을 보기 좋게 목록으로 그려줍니다.
function renderMailboxList() {
    var listContainer = document.getElementById('mailbox-list');
    if (!currentMailboxData || !currentMailboxData.length) {
        listContainer.innerHTML = '<p style="color:#777;text-align:center;padding:20px 0;">우편함이 비어있습니다.</p>';
        return;
    }
    var PH = (typeof PLACEHOLDER_ITEM !== 'undefined') ? PLACEHOLDER_ITEM : 'https://placehold.co/100';
    
    // 우편 배열을 돌면서 '수락', '거절' 버튼이 달린 네모 박스들을 만듭니다.
    listContainer.innerHTML = currentMailboxData.map(function (item, index) {
        var name = '?', desc = '', img = PH, count = 1;
        if (typeof item === 'object' && item.name) {
            name = item.name; desc = item.desc || ''; img = item.img || PH; count = item.count || 1;
        } else if (typeof item === 'string') {
            var p = item.split(':');
            name = p[0] || '?'; desc = p[1] || '';
            if (p.length > 2) img = p.slice(2).join(':');
        }
        var badge = count > 1
            ? '<span style="background:var(--accent-color);color:#000;padding:2px 4px;border-radius:4px;font-size:10px;font-weight:bold;margin-left:5px;">x' + count + '</span>'
            : '';
        return '<div class="mail-item-card" style="display:flex;align-items:center;gap:10px;background:#222;padding:10px;border-radius:8px;border:1px solid #444;margin-bottom:10px;">' +
            '<img src="' + img + '" onerror="this.src=\'' + PH + '\'" class="mail-item-img" style="width:40px;height:40px;object-fit:cover;border-radius:4px;">' +
            '<div style="flex-grow:1;">' +
                '<div style="color:var(--accent-color);font-weight:bold;">' + name + badge + '</div>' +
                '<div style="color:#aaa;font-size:0.8rem;">' + desc + '</div>' +
            '</div>' +
            '<div style="display:flex;flex-direction:column;gap:5px;">' +
                '<button onclick="acceptMail(' + index + ', this)" style="background:#4caf50;color:#fff;border:none;padding:6px 12px;border-radius:4px;cursor:pointer;">수락</button>' +
                '<button onclick="deleteMail(' + index + ')"       style="background:#8b0000;color:#fff;border:none;padding:6px 12px;border-radius:4px;cursor:pointer;">거절</button>' +
            '</div>' +
            '</div>';
    }).join('');
}

// 우편함에서 '수락'을 눌러 아이템을 내 가방으로 넣는 함수입니다.
window.acceptMail = async function (idx, btn) {
    var profile = (typeof allProfiles !== 'undefined')
        ? allProfiles.find(function (p) { return p.char_id === currentEditingId && p.phase === currentEditingPhase; })
        : null;

    var rawInv = profile ? profile.inventory : [];
    var myInv  = [];
    if (typeof rawInv === 'string') {
        try { myInv = JSON.parse(rawInv); } catch (e) { myInv = []; }
    } else if (Array.isArray(rawInv)) {
        myInv = rawInv.slice();
    }
    while (myInv.length < 20) myInv.push(null); // 배열이 모자라면 20칸까지 빈칸으로 늘립니다.

    var incomingItem = currentMailboxData[idx];
    var itemName  = typeof incomingItem === 'object' ? incomingItem.name : (typeof incomingItem === 'string' ? incomingItem.split(':')[0] : null);
    var incCount  = typeof incomingItem === 'object' ? (incomingItem.count || 1) : 1;
    var placed    = false;

    // 가방에 완전히 똑같은 이름의 아이템이 있으면 수량만 덧셈해줍니다.
    if (itemName) {
        for (var i = 0; i < 20; i++) {
            if (myInv[i] && myInv[i].name === itemName) {
                myInv[i].count = (myInv[i].count || 1) + incCount;
                placed = true;
                break;
            }
        }
    }

    // 똑같은 아이템이 없다면 가방의 첫 번째 빈칸을 찾아 넣습니다.
    if (!placed) {
        var emptyIdx = -1;
        for (var j = 0; j < 20; j++) {
            if (myInv[j] === null || myInv[j] === '') { emptyIdx = j; break; }
        }
        if (emptyIdx === -1) return alert('가방이 꽉 찼습니다!'); // 빈칸이 없으면 거절
        
        if (typeof incomingItem === 'string') {
            var p = incomingItem.split(':');
            incomingItem = { name: p[0], desc: p[1] || '', img: p.slice(2).join(':'), count: 1 };
        }
        myInv[emptyIdx] = incomingItem;
    }

    // 아이템을 무사히 받았다면 우편함 리스트에서 그 편지를 지웁니다.
    currentMailboxData.splice(idx, 1);
    btn.innerText = '수령중..'; btn.disabled = true;

    try {
        await upsertProfileData({ inventory: myInv, mailbox: currentMailboxData });
        alert('선물을 받았습니다!');
        await loadCharacterData();
        openMailboxModal(currentEditingId, currentEditingPhase); // 새로고침
    } catch (e) {
        console.error(e);
        alert('수락 중 오류가 발생했습니다.');
        btn.innerText = '수락'; btn.disabled = false;
    }
};

// 우편함에서 '거절'을 눌러 편지를 지워버리는 함수입니다.
window.deleteMail = async function (idx) {
    if (confirm('이 우편을 파기하시겠습니까?')) {
        currentMailboxData.splice(idx, 1);
        await upsertProfileData({ mailbox: currentMailboxData });
        renderMailboxList();
    }
};

// ─────────────────────────────────────────────────────────────────
// 7. 소지금 관리 기능
// ─────────────────────────────────────────────────────────────────
// 소지금 영역을 클릭하면 금액을 더하거나 뺄 수 있는 팝업창을 엽니다.
window.openMoneyModal = function (charId, phaseIndex) {
    currentEditingId    = charId;
    currentEditingPhase = phaseIndex;
    var profile = (typeof allProfiles !== 'undefined')
        ? allProfiles.find(function (p) { return p.char_id === charId && p.phase === phaseIndex; })
        : null;
        
    // 콤마가 포함된 문자열(예: "1,000")에서 콤마를 제거하고 진짜 숫자로 만듭니다.
    currentMoney = (profile && profile.money) ? parseInt(String(profile.money).replace(/,/g, '')) : 0;
    document.getElementById('current-money-display').innerText = currentMoney.toLocaleString() + ' G';
    document.getElementById('money-amount').value = '';
    document.getElementById('money-modal').classList.add('show');
};

// '적립하기'나 '소비하기' 버튼을 누르면 데이터베이스의 돈을 수정합니다.
window.processMoney = async function (type) {
    var amtInput = document.getElementById('money-amount');
    var amount   = parseInt(amtInput.value);
    if (!amount || amount <= 0) return alert('금액을 정확히 입력해주세요.');
    if (!currentUser) return alert('로그인이 필요합니다.');

    var myCharId = charOwners[currentUser.email];
    if (!myCharId) return alert('캐릭터 권한이 없습니다.');

    // 최신 돈 정보를 DB에서 가져옵니다.
    var res = await supabaseClient
        .from('character_profiles').select('money')
        .eq('char_id', myCharId).eq('phase', 0).single();

    var curMoney = 0;
    if (res.data && res.data.money) {
        curMoney = parseInt(String(res.data.money).replace(/,/g, ''), 10) || 0;
    }

    // type이 add면 돈을 더하고, sub면 뺍니다.
    var newMoney = (type === 'add') ? curMoney + amount : curMoney - amount;
    if (newMoney < 0) return alert('소지금이 부족하여 차감할 수 없습니다.');

    var upd = await supabaseClient
        .from('character_profiles')
        .update({ money: newMoney })
        .eq('char_id', myCharId).eq('phase', 0);

    if (upd.error) {
        alert('업데이트 실패');
    } else {
        alert(amount.toLocaleString() + ' G가 정상적으로 ' + (type === 'add' ? '적립' : '소비') + '되었습니다.');
        currentMoney = newMoney;
        document.getElementById('current-money-display').innerText = newMoney.toLocaleString() + ' G';
        amtInput.value = '';
        if (typeof loadCharacterData === 'function') loadCharacterData();
        closeModal('money-modal');
    }
};

// ─────────────────────────────────────────────────────────────────
// 8. 캐릭터 화면 인벤토리 미리보기 (모달창 밖의 화면)
// ─────────────────────────────────────────────────────────────────
// 화면상 인벤토리가 소지품 탭인지 보관함 탭인지를 기억합니다.
var _previewTabState = {}; 

// 사용자가 화면에서 소지품/보관함 탭 버튼을 눌렀을 때 작동하는 함수입니다.
window.switchInvPreviewTab = function (charId, tab) {
    _previewTabState[charId] = tab;
    
    var section = document.getElementById(charId); if (!section) return;
    
    // 버튼들의 색깔을 바꿔서 어떤 탭이 눌렸는지 티를 냅니다.
    section.querySelectorAll('.inv-preview-tab-btn').forEach(function (btn) {
        var isActive = btn.getAttribute('data-tab') === tab;
        btn.style.background  = isActive ? 'rgba(215,179,61,0.25)' : 'rgba(0,0,0,0.3)';
        btn.style.color       = isActive ? '#d7b33d' : '#777';
        btn.style.fontWeight  = isActive ? '600' : '400';
    });
    
    var p0 = null;
    if (typeof allProfiles !== 'undefined') {
        p0 = allProfiles.find(function (p) {
            var pid = p.char_id.startsWith('char-') ? p.char_id : 'char-' + p.char_id;
            return pid === charId && p.phase === 0;
        });
    }

    // ★ 추가: DB 데이터가 없으면 빈 가방으로 간주하여 전환 에러를 방지합니다.
    if (!p0) p0 = { inventory: [], furniture_inventory: [] };
    
    _renderAllSlides(charId, p0, tab);
};

// 1부부터 4부까지 모든 슬라이드의 인벤토리를 변경해주는 함수입니다.
function _renderAllSlides(charId, p0Profile, tab) {
    var section = document.getElementById(charId); if (!section) return;
    var slides  = section.querySelectorAll('.phase-slide');
    slides.forEach(function (slide) {
        var invContainer = slide.querySelector('.rpg-inventory');
        if (!invContainer) return;
        _renderInvIntoContainer(invContainer, p0Profile, tab);
    });
}

// 화면의 그리드 컨테이너에 아이템 이미지 박스를 생성해 꽂아 넣습니다.
function _renderInvIntoContainer(container, profile, tab) {
    var rawSrc = (tab === 'furniture') ? profile.furniture_inventory : profile.inventory;
    var myInv  = [];
    if (typeof rawSrc === 'string') {
        try { myInv = JSON.parse(rawSrc); } catch (e) { myInv = []; }
    } else if (Array.isArray(rawSrc)) {
        myInv = rawSrc.slice();
    }
    
    // 소지품 탭이면 일반 아이템만, 보관함 탭이면 가구류 아이템만 남깁니다.
    myInv = myInv.filter(function (item) {
        if (!item) return false;
        var isFurn = item.type === 'furniture' || item.isFurniture;
        return tab === 'furniture' ? isFurn : !isFurn;
    });

    var html = '';
    for (var i = 0; i < 20; i++) {
        var item  = myInv[i];
        var name  = '', img = '', count = 1;
        if (item && typeof item === 'object' && item.name) {
            name = item.name; img = item.img || ''; count = parseInt(item.count) || 1;
        } else if (typeof item === 'string' && item.trim() && item.indexOf('[object') === -1) {
            var pts = item.split(':');
            name = pts[0] || '?';
            img  = pts.length > 2 ? pts.slice(2).join(':') : '';
            count = 1;
        }
        
        // 아이템이 있으면 사진과 이름을 넣은 네모 칸을, 없으면 빈 네모 칸을 만듭니다.
        if (name) {
            var badge = count > 1
                ? '<div style="position:absolute;top:2px;right:2px;background:var(--accent-color,#d7b33d);color:#000;font-size:10px;font-weight:bold;padding:2px 4px;border-radius:4px;z-index:5;">x' + count + '</div>'
                : '';
            var imgSrc = img || 'https://placehold.co/100?text=No+Img';
            html +=
                '<div class="inv-slot" title="' + name + '" style="position:relative;overflow:hidden;background:#222;border:1px solid rgba(215,179,61,0.3);aspect-ratio:1;">' +
                badge +
                '<img src="' + imgSrc + '" onerror="this.src=\'https://placehold.co/100?text=Error\'" style="width:100%;height:100%;object-fit:cover;position:absolute;inset:0;z-index:1;">' +
                '<div style="position:absolute;bottom:0;left:0;width:100%;background:rgba(0,0,0,0.7);font-size:10px;color:#fff;text-align:center;padding:2px 0;z-index:3;">' + name + '</div>' +
                '</div>';
        } else {
            html += '<div class="inv-slot" style="background:#111;border:1px solid rgba(215,179,61,0.3);aspect-ratio:1;"></div>';
        }
    }
    container.innerHTML = html;
}

// 화면상 인벤토리 위에 '소지품' / '보관함' 탭 버튼을 만들어 꽂아주는 함수입니다.
function _ensureInvPreviewTabs(charId) {
    var section = document.getElementById(charId); if (!section) return;
    var slides  = section.querySelectorAll('.phase-slide');
    var tab     = _previewTabState[charId] || 'general';
    
    slides.forEach(function (slide) {
        var slot = slide.querySelector('.inv-tab-slot');
        if (!slot) return;
        // ▼ 기존에 버튼이 있으면 제거 후 재생성합니다.
        //   (탭 전환이나 부 이동 후 버튼이 사라지는 버그를 방지합니다)
        var existing = slot.querySelectorAll('.inv-preview-tab-btn');
        existing.forEach(function(b){ b.remove(); });

        var gActive = (tab === 'general');

        var btnBase = 'flex:1; padding:6px 0; font-size:0.75rem; font-family:\'Nanum Myeongjo\', serif; cursor:pointer; border:none; border-radius:20px; transition:all 0.2s ease; text-align:center; letter-spacing:1px; white-space:nowrap;';
        
        var btnG = btnBase + (gActive
            ? 'background:linear-gradient(135deg, #e5c56d, #b8952d); color:#111; font-weight:bold; box-shadow:0 1px 3px rgba(0,0,0,0.4);'
            : 'background:transparent; color:#888; font-weight:400;');
            
        var btnF = btnBase + (!gActive
            ? 'background:linear-gradient(135deg, #e5c56d, #b8952d); color:#111; font-weight:bold; box-shadow:0 1px 3px rgba(0,0,0,0.4);'
            : 'background:transparent; color:#888; font-weight:400;');

        slot.innerHTML =
            '<button class="inv-preview-tab-btn" data-tab="general"' +
            ' onclick="switchInvPreviewTab(\'' + charId + '\',\'general\')"' +
            ' style="' + btnG + '">소지품</button>' +
            '<button class="inv-preview-tab-btn" data-tab="furniture"' +
            ' onclick="switchInvPreviewTab(\'' + charId + '\',\'furniture\')"' +
            ' style="' + btnF + '">보관함</button>';
    });
}

// 데이터베이스를 다시 읽어올 때 화면에 있는 인벤토리 탭과 아이템 박스들을 전부 리프레시합니다.
window.refreshInventoryPreviews = function () {
    // charData가 없으면 실행 중지
    if (typeof charData === 'undefined') return;

    // DB 데이터(allProfiles) 대신 화면에 설정된 캐릭터(charData) 기준으로 탭을 100% 생성합니다.
    charData.forEach(function (c) {
        var charId = 'char-' + c.id;

        // 1. 탭 버튼을 무조건 꽂아 넣습니다.
        _ensureInvPreviewTabs(charId);

        // 2. DB에서 이 캐릭터의 인벤토리 데이터를 찾습니다.
        var p0 = null;
        if (typeof allProfiles !== 'undefined') {
            p0 = allProfiles.find(function (p) {
                var pid = p.char_id.startsWith('char-') ? p.char_id : 'char-' + p.char_id;
                return pid === charId && p.phase === 0;
            });
        }

        // 3. DB에 데이터가 없더라도 화면이 깨지지 않게 '빈 가방' 데이터를 임의로 넣어줍니다.
        if (!p0) p0 = { inventory: [], furniture_inventory: [] };

        var tab = _previewTabState[charId] || 'general';
        _renderAllSlides(charId, p0, tab);
    });
};

// ─────────────────────────────────────────────────────────────────
// 9. 프로그램 자동 훅 (Hook) - 타이머 연결
// ─────────────────────────────────────────────────────────────────
// 캐릭터 데이터를 불러올 때마다 자동으로 인벤토리 그리기도 다시 하도록 감시하는 장치입니다.
var _loadCharHooked = false;

var _hookInterval = setInterval(function () {
    // loadCharacterData 함수가 준비되었고, 아직 감시 장치(훅)를 안 달았다면
    if (typeof window.loadCharacterData === 'function' && !_loadCharHooked) {
        _loadCharHooked = true;         // 달았다고 표시하고
        clearInterval(_hookInterval);   // 계속 감시하던 타이머를 끕니다.

        // 원래 함수를 잠시 떼어놓고
        var _originalLoad = window.loadCharacterData;
        // 새로운 동작(인벤토리 새로고침)을 덧붙인 함수로 교체합니다.
        window.loadCharacterData = async function () {
            await _originalLoad.apply(this, arguments);
            window.refreshInventoryPreviews();
        };
    }
}, 200); // 0.2초마다 검사합니다.

// ─────────────────────────────────────────────────────────────────
// 10. 캐릭터 탭 전환 시 BGM 위젯을 자동으로 바꿔주는 훅
// ─────────────────────────────────────────────────────────────────
// 캐릭터 탭('char-ho1' 등)으로 이동할 때마다 해당 캐릭터의 BGM을
// 자동으로 불러와 index.html의 BGM 위젯에 세팅합니다.
//
// ★ BGM 설정 방법:
//   캐릭터 카드의 연필(수정) 버튼 → 기본 정보 수정창 → [테마곡] 입력란에
//   유튜브 링크를 붙여넣으면 됩니다.
//   예) https://youtu.be/QnTiROAeKtI
//       https://www.youtube.com/watch?v=QnTiROAeKtI
//
//   BGM을 지우고 싶으면 입력란을 비워두고 저장하면 됩니다.
var _openTabHooked    = false;
var _bgmHookInterval  = setInterval(function () {

    // openTab 함수가 준비됐고, 아직 감시 장치를 안 달았다면
    if (typeof window.openTab === 'function' && !_openTabHooked) {
        _openTabHooked = true;
        clearInterval(_bgmHookInterval);

        var _originalOpenTab = window.openTab;

        // 원래 openTab 함수를 감싸서 BGM 세팅 동작을 덧붙입니다.
        window.openTab = function (tabName, btn) {

            // 1. 기존의 탭 전환 동작을 그대로 실행합니다.
            _originalOpenTab.apply(this, arguments);

            // 2. 캐릭터 탭('char-')으로 이동한 경우에만 BGM을 처리합니다.
            if (typeof allProfiles !== 'undefined' && tabName.startsWith('char-')) {

                // DB에서 해당 캐릭터의 1부(phase 0) 프로필을 찾습니다.
                var p0 = allProfiles.find(function (p) {
                    var pid = p.char_id.startsWith('char-') ? p.char_id : 'char-' + p.char_id;
                    return pid === tabName && p.phase === 0;
                });

                if (p0 && typeof setupCharacterBGM === 'function') {
                    // 프로필에 BGM 주소가 있으면 위젯에 세팅합니다.
                    setupCharacterBGM(p0.bgm_url);
                } else if (typeof setupCharacterBGM === 'function') {
                    // BGM이 없으면 위젯을 숨깁니다.
                    setupCharacterBGM('');
                }

            } else {
                // 상점, 대문, 화첩 등 다른 탭으로 이동하면 BGM 위젯을 숨깁니다.
                if (typeof setupCharacterBGM === 'function') setupCharacterBGM('');
            }
        };
    }

}, 200); // 0.2초마다 검사합니다.
