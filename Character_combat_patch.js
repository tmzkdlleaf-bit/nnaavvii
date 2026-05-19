/* ================================================================= */
/*  character_combat_patch.js — 전투 관련 보조 기능 추가 파일          */
/*  초보자 안내: 이 파일은 기본 정보창에 '전투 이미지 첨부' 칸을 만들고,  */
/*  가방(인벤토리)의 아이템 데이터를 분석해 예쁘게 20칸으로 그려줍니다.   */
/* ================================================================= */

/* ─────────────────────────────────────────────────────────────────
   1. 기본 정보 모달 가로채기 (전투 이미지 추가용)
───────────────────────────────────────────────────────────────── */
// IIFE(즉시 실행 함수)입니다. 페이지가 로드되자마자 알아서 쓱 실행됩니다.
(function patchCombatImg() {
    var _orig = window.openGeneralModal; // 원래 있던 '기본 정보창 띄우기' 기능을 잠시 따로 보관합니다.
    if (typeof _orig !== 'function') { setTimeout(patchCombatImg, 500); return; } // 아직 준비 안됐으면 0.5초 뒤에 다시 확인합니다.
    
    // 원래 기능에 내 코드를 덧붙여서 새로 정의합니다.
    window.openGeneralModal = function (charId, phaseIdx) {
        _orig(charId, phaseIdx); // 원래 팝업 띄우던 동작은 그대로 실행합니다.
        // 그리고 0.1초 뒤에 '전투 이미지 섹션'을 팝업창 안에 몰래 주입합니다.
        setTimeout(function () { _injectCombatImgSection(charId); }, 100);
    };
})();

// 기본 정보창 팝업 하단에 '전투 이미지' 업로드 칸을 HTML로 만들어 꽂아넣는 함수입니다.
function _injectCombatImgSection(charId) {
    var modal = document.getElementById('edit-modal');
    // 이미 이 칸이 만들어져 있으면 두 번 만들지 않고 멈춥니다.
    if (!modal || modal.querySelector('#combat-img-section')) return;

    // 데이터베이스에서 내 전투 이미지가 있는지 찾아봅니다.
    var profile = (typeof allProfiles !== 'undefined')
        ? allProfiles.find(function (p) { return p.char_id === charId && p.phase === 0; })
        : null;
    var cur = (profile && profile.combat_img) ? profile.combat_img : '';

    var saveBtn = modal.querySelector('#save-btn'); // 저장 버튼을 찾습니다.
    if (!saveBtn) return;

    // 현재 이미지가 있으면 이미지를 보여주고, 없으면 없다고 글씨를 씁니다.
    var previewHTML = cur
        ? '<img src="' + cur + '" style="width:80px;height:107px;object-fit:cover;object-position:top;border-radius:4px;margin-bottom:10px;display:block;">'
        : '<div style="color:#555;font-size:0.8rem;margin-bottom:10px;">현재 전투 이미지 없음 (프로필 이미지 사용)</div>';

    // 새로운 HTML 구역을 만듭니다.
    var section = document.createElement('div');
    section.id = 'combat-img-section';
    section.style.cssText = 'margin-top:20px;background:rgba(0,0,0,0.4);padding:16px;border-radius:10px;border:1px dashed rgba(215,179,61,0.3);';
    section.innerHTML =
        '<h3 style="font-size:1rem;color:var(--accent-color);margin:0 0 10px;">전투 이미지</h3>' +
        '<p style="color:#777;font-size:0.78rem;margin-bottom:12px;line-height:1.5;">대련장 팀전 전장에서 표시되는 이미지.<br>세로형(3:4 비율) 권장.</p>' +
        previewHTML +
        '<div style="display:flex;gap:10px;align-items:center;">' +
        // 파일 첨부 버튼
        '<input type="file" id="combat-img-file" accept="image/*" style="flex:1;color:#aaa;font-size:0.82rem;">' +
        // 저장 버튼 (클릭 시 아래의 saveCombatImg 함수 실행)
        '<button onclick="saveCombatImg(\'' + charId + '\')" class="auth-btn" style="width:100px;margin:0;padding:8px 0;font-size:0.85rem;">전투 이미지 저장</button>' +
        '</div>' +
        '<div id="combat-img-status" style="margin-top:8px;font-size:0.8rem;color:#aaa;"></div>';

    // 만들어진 구역을 원래 팝업창의 저장 버튼 바로 위에 끼워 넣습니다.
    saveBtn.parentNode.insertBefore(section, saveBtn);
}


/* ─────────────────────────────────────────────────────────────────
   2. 전투 이미지 데이터베이스에 저장
───────────────────────────────────────────────────────────────── */
// 첨부된 파일을 이미지 서버에 올리고 DB에 기록하는 함수입니다.
window.saveCombatImg = async function (charId) {
    var fileInput = document.getElementById('combat-img-file');
    var status    = document.getElementById('combat-img-status');
    
    // 파일을 안 올리고 버튼을 누르면 막습니다.
    if (!fileInput || !fileInput.files.length) {
        if (status) status.innerText = '파일을 선택해주세요.';
        return;
    }
    if (!currentUser) { alert('로그인이 필요합니다.'); return; }
    
    if (status) status.innerText = '업로드 중...';

    // ImgBB 서버에 이미지를 업로드합니다.
    var url = await uploadToImgbb(fileInput.files[0]);
    if (!url) { if (status) status.innerText = '업로드 실패. 다시 시도해주세요.'; return; }

    // 데이터베이스(Supabase)에 업로드된 주소를 기록합니다.
    var res = await supabaseClient.from('character_profiles').update({ combat_img: url }).eq('char_id', charId).eq('phase', 0);
    if (res.error) { if (status) status.innerText = '저장 실패: ' + res.error.message; return; }

    // 내 화면의 캐시 데이터(allProfiles)도 강제로 새로고침해줍니다.
    if (typeof allProfiles !== 'undefined') {
        var cached = allProfiles.find(function (p) { return p.char_id === charId && p.phase === 0; });
        if (cached) cached.combat_img = url;
    }
    
    if (status) status.innerText = '전투 이미지 저장 완료!';

    // 화면의 미리보기 이미지를 방금 올린 이미지로 즉시 교체합니다.
    var section = document.getElementById('combat-img-section');
    if (section) {
        var oldImg = section.querySelector('img');
        var oldMsg = section.querySelector('div[style*="color:#555"]');
        if (oldImg) { oldImg.src = url; }
        else if (oldMsg) {
            var img = document.createElement('img');
            img.src = url;
            img.style.cssText = 'width:80px;height:107px;object-fit:cover;object-position:top;border-radius:4px;margin-bottom:10px;display:block;';
            oldMsg.replaceWith(img);
        }
    }
};


/* ─────────────────────────────────────────────────────────────────
   3. loadCharacterData 가로채기 (인벤토리 화면 새로고침용)
───────────────────────────────────────────────────────────────── */
// 캐릭터 데이터를 불러올 때마다 덤으로 인벤토리 화면도 같이 싹 다시 그리도록 만드는 함수입니다.
(function patchInventoryRender() {
    var _orig = window.loadCharacterData;
    if (typeof _orig !== 'function') { setTimeout(patchInventoryRender, 300); return; }
    if (_orig._invPatched) return; // 이미 가로챘으면 그만합니다.
    
    var wrapped = async function () {
        await _orig.apply(this, arguments); // 원래 데이터를 불러오는 동작을 먼저 끝내고
        _reRenderAllInventories(); // 우리가 만든 전체 인벤토리 그리기 기능을 추가로 실행합니다.
    };
    wrapped._invPatched = true;
    window.loadCharacterData = wrapped;
})();


/* ─────────────────────────────────────────────────────────────────
   4. 인벤토리 데이터 정리 정돈 (파싱 헬퍼)
───────────────────────────────────────────────────────────────── */
// 데이터베이스에서 인벤토리는 보통 복잡한 글자 뭉치(JSON이나 문자열)로 저장됩니다.
// 이것들을 자바스크립트가 알아볼 수 있는 깔끔한 20칸짜리 배열 박스로 만들어주는 기계입니다.
function _parseInventoryUniversal(raw) {
    if (!raw) return new Array(20).fill(null); // 데이터가 아예 없으면 20칸짜리 빈 박스를 줍니다.
    var arr = [];

    // JSON 형식인 경우 처리
    if (typeof raw === 'string' && raw.trim().startsWith('[')) {
        try { arr = JSON.parse(raw); } catch (e) { arr = []; }
    } 
    // 예전 방식(쉼표와 콜론으로 연결된 문자열)인 경우 처리
    else if (typeof raw === 'string') {
        arr = raw.split(',').map(function (s) {
            var t = s.trim();
            if (!t || t.indexOf('[object') !== -1) return null;
            if (t.startsWith('{')) { try { return JSON.parse(t); } catch (e) {} }
            if (t.indexOf(':') !== -1) {
                var p = t.split(':');
                return { name: p[0] || '', desc: p[1] || '', img: p.slice(2).join(':'), count: 1 };
            }
            return null;
        });
    } 
    // 이미 잘 정돈된 배열인 경우
    else if (Array.isArray(raw)) {
        arr = raw;
    }

    // 최종적으로 깔끔한 20칸짜리 결과 배열을 만듭니다.
    var result = [];
    for (var i = 0; i < 20; i++) {
        var item = arr[i];
        if (!item) { result.push(null); continue; }
        
        // 아이템의 이름, 설명, 이미지, 개수를 확실하게 규격화합니다.
        if (typeof item === 'object' && item.name) {
            result.push({ name: item.name, desc: item.desc || '', img: item.img || '', count: parseInt(item.count) || 1 });
        } else if (typeof item === 'string' && item.trim() && item.indexOf('[object') === -1) {
            var p2 = item.split(':');
            result.push({ name: p2[0] || '', desc: p2[1] || '', img: p2.slice(2).join(':'), count: 1 });
        } else {
            result.push(null);
        }
    }
    return result;
}


/* ─────────────────────────────────────────────────────────────────
   5. 전체 캐릭터의 화면 인벤토리 다시 그리기
───────────────────────────────────────────────────────────────── */
// 위에서 잘 정리된 20칸 배열을 바탕으로 실제 화면(HTML)에 네모 박스들을 그리는 함수입니다.
function _reRenderAllInventories() {
    if (typeof allProfiles === 'undefined') return;
    
    // 그림이 없는 아이템을 위한 기본 회색 박스 이미지입니다.
    var PH = (typeof PLACEHOLDER_ITEM !== 'undefined') ? PLACEHOLDER_ITEM : 'https://placehold.co/100x100?text=?';

    allProfiles.forEach(function (profile) {
        var section = document.getElementById(profile.char_id);
        if (!section || !profile.inventory) return;
        var targetSlide = section.querySelectorAll('.phase-slide')[profile.phase || 0];
        if (!targetSlide) return;
        var invWrapper = targetSlide.querySelector('.rpg-inventory');
        if (!invWrapper) return;

        // DB 데이터를 가져와 20칸 배열로 정리합니다.
        var parsed = _parseInventoryUniversal(profile.inventory);
        var html = '';
        
        // 20칸을 돌면서 네모 박스 HTML을 찍어냅니다.
        for (var i = 0; i < 20; i++) {
            var item = parsed[i];
            if (item && item.name) {
                // 아이템이 2개 이상 겹쳐있으면 우측 상단에 조그맣게 'x2'라고 수량 배지를 달아줍니다.
                var badge = item.count > 1
                    ? '<div style="position:absolute;top:2px;right:2px;background:#d7b33d;color:#000;font-size:10px;font-weight:bold;padding:1px 4px;border-radius:3px;z-index:10;">x' + item.count + '</div>'
                    : '';
                    
                html += '<div class="inv-slot" style="position:relative;overflow:hidden;">' +
                    badge +
                    '<img src="' + (item.img || PH) + '" onerror="this.src=\'' + PH + '\'" style="width:100%;height:100%;object-fit:cover;">' +
                    // 마우스를 올렸을 때 나타나는 툴팁 설명창입니다.
                    '<div class="item-tooltip"><span class="item-title">' + item.name + '</span>' + (item.desc || '') + '</div>' +
                    '</div>';
            } else {
                // 빈칸은 그냥 빈 껍데기만 만듭니다.
                html += '<div class="inv-slot"></div>';
            }
        }
        
        // 만들어진 HTML을 화면의 인벤토리 공간에 확 덮어씌웁니다.
        invWrapper.innerHTML = html;
        invWrapper.setAttribute('data-inventory', JSON.stringify(parsed));
    });
}