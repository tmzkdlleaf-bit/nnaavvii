/* ================================================================= */
/*  Features.js — 갤러리 / 상점 / 캘린더 / 미니게임 / 증권거래소 기능 모음 */
/*  초보자 안내: 이 파일은 웹사이트에서 제공하는 재밌는 놀거리들을 관리합니다. */
/*  사진을 올리고, 물건을 사고, 미니게임으로 돈을 버는 기능들이 모여있습니다. */
/* ================================================================= */


/* ================================================================= */
/* 1. 화첩 (갤러리 및 기록 보관소 기능)                                  */
/* ================================================================= */

// 데이터베이스에서 사람들이 쓴 글과 사진을 가져와서 화면에 보여주는 함수입니다.
async function loadGalleryData(page) {
    page = page || 1; // 페이지 번호가 없으면 1페이지부터 보여줍니다.
    currentGalleryPage = page;
    var container = document.getElementById('gallery-list-container');
    if (!container) return; // 화면에 그릴 공간이 없으면 멈춥니다.

    // 데이터베이스(gallery_posts 테이블)에서 현재 시간대에 맞는 모든 글을 오래된 순서대로 가져옵니다.
    var res = await supabaseClient
        .from('gallery_posts').select('*').eq('phase', currentEditingPhase)
        .order('created_at', { ascending: true });

    var data  = res.data;
    var error = res.error;

    // 글이 한 개도 없거나 에러가 났을 때 보여줄 화면입니다.
    if (error || !data || data.length === 0) {
        container.innerHTML = error
            ? '<p>오류 발생</p>'
            : "<p style='text-align:center;color:#555;'>첫 번째 기록을 남겨보세요.</p>";
        return;
    }

    // 본문(mainPosts)과 그에 달린 답글(replies)을 분류합니다.
    var mainPosts  = data.filter(function (p) { return !p.parent_id; });
    var replies    = data.filter(function (p) { return  p.parent_id; });
    
    // 전체 페이지 수를 계산하고, 현재 페이지에 보여줄 5개의 글만 잘라냅니다.
    var totalPages = Math.ceil(mainPosts.length / GALLERY_POSTS_PER_PAGE);
    var startIndex = (currentGalleryPage - 1) * GALLERY_POSTS_PER_PAGE;
    var currPosts  = mainPosts.slice(startIndex, startIndex + GALLERY_POSTS_PER_PAGE);
    
    // 현재 접속한 사람이 누구인지 확인합니다. (내 글만 지울 수 있게 하려고)
    var myCharId   = currentUser ? charOwners[currentUser.email] : null;

    var html = '';
    // 가져온 5개의 글을 하나씩 돌면서 화면에 그릴 HTML(박스)을 조립합니다.
    currPosts.forEach(function (post) {
        var isMine      = myCharId === post.char_id;
        var deleteBtn   = isMine
            ? '<button class="btn-reply" onclick="deleteGalleryPost(' + post.id + ')">삭제</button>' : '';
            
        // 이 글에 달린 답글들을 찾아서 개수를 셉니다.
        var postReplies = replies.filter(function (r) { return r.parent_id == post.id; });
        var replyCount  = postReplies.length;
        var toggleBtn   = replyCount > 0
            ? '<button class="btn-toggle-replies" onclick="toggleReplies(' + post.id + ')">답글 ' + replyCount + '개 보기</button>' : '';

        // 답글들을 보여주는 작은 박스들을 만듭니다.
        var repliesHtml = postReplies.map(function (r) {
            var isReplyMine    = myCharId === r.char_id;
            var replyDeleteBtn = isReplyMine
                ? '<button class="btn-reply" style="padding:4px 10px;font-size:0.75rem;margin-top:0;" onclick="deleteGalleryPost(' + r.id + ')">삭제</button>' : '';
            return '<div class="reply-item">' +
                (r.image_url ? '<img src="' + r.image_url + '" class="reply-img" onclick="openLightbox(this.src)">' : '') +
                '<div class="post-info">' +
                    '<div style="display:flex;justify-content:space-between;align-items:center;">' +
                        '<div class="post-author" style="font-size:0.9rem;margin-bottom:0;">' + r.char_name + '</div>' +
                        replyDeleteBtn +
                    '</div>' +
                    '<div class="post-content" style="font-size:0.9rem;margin-top:5px;">' + (r.content || '') + '</div>' +
                '</div></div>';
        }).join('');

        // 본문과 답글을 합쳐서 커다란 게시글 박스 하나를 만듭니다.
        html +=
            '<div class="gallery-post-container">' +
                '<div class="post-main">' +
                    (post.image_url ? '<img src="' + post.image_url + '" class="post-img" onclick="openLightbox(this.src)">' : '') +
                    '<div class="post-info">' +
                        '<div class="post-author">' + post.char_name + '</div>' +
                        '<div class="post-date">' + new Date(post.created_at).toLocaleString() + '</div>' +
                        '<div class="post-content">' + (post.content || '') + '</div>' +
                        '<div style="display:flex;gap:10px;margin-top:10px;align-items:center;">' +
                            '<button class="btn-reply" onclick="showReplyForm(' + post.id + ')">답글 달기</button>' +
                            deleteBtn +
                        '</div>' +
                        toggleBtn +
                    '</div>' +
                '</div>' +
                // 평소엔 답글을 숨겨둡니다. (display:none)
                '<div class="post-replies" id="replies-' + post.id + '" style="display:none;">' + repliesHtml + '</div>' +
            '</div>';
    });

    // 글이 5개를 넘어가면 1, 2, 3 같은 페이지 이동 버튼을 만들어줍니다.
    if (totalPages > 1) {
        html += '<div class="gallery-pagination">';
        for (var i = 1; i <= totalPages; i++)
            html += '<button class="page-btn ' + (i === currentGalleryPage ? 'active' : '') + '" onclick="loadGalleryData(' + i + ')">' + i + '</button>';
        html += '</div>';
    }
    
    // 완성된 HTML을 화면에 붓습니다.
    container.innerHTML = html;
}

// '답글 보기' 버튼을 누르면 숨어있던 답글 상자가 스르륵 나오게 하는 함수입니다.
window.toggleReplies = function (postId) {
    var repliesDiv = document.getElementById('replies-' + postId);
    var btn        = document.querySelector('button[onclick="toggleReplies(' + postId + ')"]');
    if (!repliesDiv || !btn) return;
    
    var isHidden             = repliesDiv.style.display === 'none';
    repliesDiv.style.display = isHidden ? 'flex' : 'none';
    btn.innerText = btn.innerText.replace(isHidden ? '보기' : '닫기', isHidden ? '닫기' : '보기');
};

// 답글을 다는 팝업창(모달)을 화면에 띄우는 함수입니다.
window.showReplyForm = function (parentId) {
    document.getElementById('reply-parent-id').value     = parentId; // 어느 글에 답글을 다는지 기억합니다.
    document.getElementById('reply-modal-content').value = '';
    document.getElementById('reply-modal-file').value    = '';
    document.getElementById('reply-modal').classList.add('show');
};

// 갤러리에 새 글이나 사진을 올리는 함수입니다.
window.uploadGalleryPost = async function () {
    if (!currentUser) return alert('로그인이 필요합니다.');
    var myCharId = charOwners[currentUser.email];
    if (!myCharId) return alert('권한이 없습니다.');

    var content   = document.getElementById('gal-content').value;
    var fileInput = document.getElementById('gal-file');
    if (!content && fileInput.files.length === 0) return alert('내용이나 이미지를 입력해주세요.');

    var uploadedUrl = null;
    // 사진이 있으면 외부 서버(ImgBB)에 먼저 올려서 인터넷 주소를 받아옵니다.
    if (fileInput.files.length > 0) {
        var btn = event.target; btn.innerText = '전송중…'; btn.disabled = true;
        uploadedUrl = await uploadToImgbb(fileInput.files[0]);
        if (!uploadedUrl) {
            alert('서버 전송 실패.');
            btn.innerText = '기록'; btn.disabled = false;
            return;
        }
    }

    // 내 캐릭터 이름을 찾습니다. 못 찾으면 '익명'이 됩니다.
    var charName = (charData.find(function (c) { return c.id === myCharId.replace('char-', ''); }) || {}).name || '익명';
    
    // 데이터베이스에 글과 사진 주소를 기록합니다.
    var res = await supabaseClient.from('gallery_posts').insert([{
        char_id:   myCharId,
        char_name: charName,
        content:   content,
        image_url: uploadedUrl,
        parent_id: null,
        phase:     currentEditingPhase,
    }]);

    if (res.error) alert('저장 실패');
    else {
        // 성공했으면 입력칸을 비우고 갤러리를 새로고침합니다.
        document.getElementById('gal-content').value = '';
        document.getElementById('gal-file').value    = '';
        if (fileInput.files.length > 0) { event.target.innerText = '기록'; event.target.disabled = false; }
        loadGalleryData(currentGalleryPage);
    }
};

// 갤러리 글에 답글을 달아 서버에 저장하는 함수입니다. (새 글 올리는 것과 원리가 똑같습니다.)
window.submitReply = async function () {
    var parentId = document.getElementById('reply-parent-id').value;
    if (!currentUser) return alert('로그인이 필요합니다.');
    var myCharId = charOwners[currentUser.email];
    if (!myCharId) return alert('권한이 없습니다.');

    var content   = document.getElementById('reply-modal-content').value;
    var fileInput = document.getElementById('reply-modal-file');
    if (!content && fileInput.files.length === 0) return alert('내용이나 이미지를 입력해주세요.');

    var uploadedUrl = null;
    if (fileInput.files.length > 0) {
        var btn = event.target; btn.innerText = '전송중…'; btn.disabled = true;
        uploadedUrl = await uploadToImgbb(fileInput.files[0]);
        if (!uploadedUrl) {
            alert('서버 전송 실패.');
            btn.innerText = '기록'; btn.disabled = false;
            return;
        }
    }

    var charName = (charData.find(function (c) { return c.id === myCharId.replace('char-', ''); }) || {}).name || '익명';
    var res = await supabaseClient.from('gallery_posts').insert([{
        char_id:   myCharId,
        char_name: charName,
        content:   content,
        image_url: uploadedUrl,
        parent_id: parentId, // 답글이기 때문에 부모 글 번호를 달아줍니다.
        phase:     currentEditingPhase,
    }]);

    if (res.error) alert('저장 실패');
    else {
        if (fileInput.files.length > 0) { event.target.innerText = '기록'; event.target.disabled = false; }
        closeModal('reply-modal');
        loadGalleryData(currentGalleryPage); // 새로고침
        
        // 답글을 다 달면 답글창이 자동으로 열려서 보이게 해줍니다.
        setTimeout(function () {
            var repliesDiv = document.getElementById('replies-' + parentId);
            var btn        = document.querySelector('button[onclick="toggleReplies(' + parentId + ')"]');
            if (repliesDiv && repliesDiv.style.display === 'none') {
                repliesDiv.style.display = 'flex';
                if (btn) btn.innerText = btn.innerText.replace('보기', '닫기');
            }
        }, 500);
    }
};

// 내 글이나 답글을 지우는 함수입니다.
window.deleteGalleryPost = async function (postId) {
    if (!confirm('정말 삭제하시겠습니까?')) return;
    var res = await supabaseClient.from('gallery_posts').delete().eq('id', postId);
    if (res.error) alert('삭제 실패');
    else           loadGalleryData(currentGalleryPage);
};


/* ================================================================= */
/* 2. 만물상 (상점 탭, 페이지 넘기기, 구매 기능)                          */
/* ================================================================= */

// 상점에서 파는 물건들의 목록입니다. Config.js에 있는 목록이 이곳에 다시 씌워집니다.
window.shopItems = [
    // 일반 품목
    { name: "현수막 변경권",  desc: "다른 사람이 바꾸기 전까지 유지됩니다.",                    img: "https://placehold.co/100x100/3a3a36/d7b33d?text=Item",                               price: 150,  type: "item" },
    { name: "가구 생성권",    desc: "나만의 커스텀 가구/벽지/바닥재를 직접 만들 수 있습니다.",  img: "https://placehold.co/100x100/d7b33d/000?text=DIY",                price: 5000, type: "item" },
    // 벽지
    { name: "더미 벽지",     desc: "색상이 칠해진 기본 벽지입니다.",                  img: "https://placehold.co/100x100/fcdada/c88?text=Wall",                price: 1500, type: "wallpaper", colorL: "#fcdada", colorR: "#f5bfbf" },
    { name: "더미 배경",     desc: "사진으로 된 배경입니다.",                          img: "https://placehold.co/100x100/000055/8af?text=BG",              price: 3500, type: "wallpaper", bgImg: "https://placehold.co/800x400/000055/8af?text=Background" },
    // 바닥재
    { name: "더미 바닥재 1", desc: "색상이 칠해진 바닥재입니다.",                       img: "https://placehold.co/100x100/8b6914/fff?text=Floor",                price: 800,  type: "floor", color: "#a0784a" },
    { name: "더미 바닥재 2", desc: "색상이 칠해진 바닥재입니다.",                       img: "https://placehold.co/100x100/e8e8e8/888?text=Floor",                price: 1200, type: "floor", color: "#d8d0c8" },
    // 가구
    { name: "더미 책상",     desc: "네모난 기본 책상입니다.",                           img: "https://placehold.co/100x100/574c40/fff?text=Desk",              price: 800,  type: "furniture", width: 120, height: 80 },
];

var SHOP_ITEMS_PER_PAGE = 8; // 한 페이지에 물건을 8개씩 보여줍니다.
var currentShopPage     = 1; // 상점을 처음 열면 1페이지부터 보여줍니다.
var currentShopTab      = 'general'; // 처음엔 '일반 물품' 탭을 보여줍니다.

// 일반 물품 탭과 가구 탭을 왔다갔다 할 때 쓰는 함수입니다.
window.changeShopTab = function (tab) {
    currentShopTab  = tab;
    currentShopPage = 1;
    var tabs = document.querySelectorAll('#shop-tabs .phase-btn');
    tabs.forEach(function (btn, i) {
        btn.classList.toggle('active', (tab === 'general') ? i === 0 : i === 1);
    });
    window.renderShop(); // 화면을 다시 그립니다.
};

// 상점 1페이지, 2페이지 버튼을 눌렀을 때 쓰는 함수입니다.
window.changeShopPage = function (page) {
    currentShopPage = page;
    window.renderShop();
};

// 구매할 때 ＋, － 버튼을 눌러 개수를 조절하는 함수입니다. (최대 10개)
window.shopQtyChange = function (idx, delta) {
    var el      = document.getElementById('shop-qty-'   + idx);
    var totalEl = document.getElementById('shop-total-' + idx);
    if (!el) return;
    var qty = Math.max(1, Math.min(parseInt(el.innerText) + delta, 10));
    el.innerText = qty;
    if (totalEl) totalEl.innerText = (window.shopItems[idx].price * qty).toLocaleString() + ' G';
};

// 상점 오른쪽 위에 내 소지금을 가져와서 보여주는 함수입니다.
window.updateShopMoneyDisplay = async function () {
    var display = document.getElementById('shop-my-money');
    if (!display) return;
    if (!currentUser)                   { display.innerText = '로그인 필요'; return; }
    var myCharId = charOwners[currentUser.email];
    if (!myCharId)                      { display.innerText = '권한 없음';  return; }
    var res = await supabaseClient
        .from('character_profiles').select('money').eq('char_id', myCharId).eq('phase', 0).single();
    display.innerText = ((res.data && res.data.money) ? parseInt(res.data.money) : 0).toLocaleString() + ' G';
};

// 상점에 물건들을 진열(화면에 그리기)하는 함수입니다.
window.renderShop = function () {
    var container = document.getElementById('shop-items-container');
    if (!container) return;

    // 현재 선택된 탭(일반 물품 or 가구)에 맞는 물건들만 골라냅니다.
    var filtered = window.shopItems
        .map(function (item, originalIndex) { return { item: item, originalIndex: originalIndex }; })
        .filter(function (d) {
            var isFurn = (d.item.type === 'furniture' || d.item.type === 'wallpaper' || d.item.type === 'floor');
            if (currentShopTab === 'general'   &&  isFurn) return false;
            if (currentShopTab === 'furniture' && !isFurn) return false;
            return true;
        });

    var totalPages = Math.ceil(filtered.length / SHOP_ITEMS_PER_PAGE);
    if (currentShopPage > totalPages && totalPages > 0) currentShopPage = totalPages;
    // 8개씩 잘라서 보여줍니다.
    var pageItems = filtered.slice(
        (currentShopPage - 1) * SHOP_ITEMS_PER_PAGE,
        currentShopPage * SHOP_ITEMS_PER_PAGE
    );

    // 물건 카드 HTML을 묶어냅니다.
    container.innerHTML = pageItems.map(function (d) {
        var item = d.item, idx = d.originalIndex;
        return '<div class="shop-item-card">' +
            '<img src="' + item.img + '" class="shop-item-img">' +
            '<div class="shop-item-title">' + item.name + '</div>' +
            '<div class="shop-item-desc">' + item.desc + '</div>' +
            '<div class="shop-item-price">' + item.price.toLocaleString() + ' G</div>' +
            '<div class="shop-qty-control">' +
                '<button class="shop-qty-btn" onclick="shopQtyChange(' + idx + ',-1)">－</button>' +
                '<span id="shop-qty-' + idx + '" class="shop-qty-val">1</span>' +
                '<button class="shop-qty-btn" onclick="shopQtyChange(' + idx + ',1)">＋</button>' +
            '</div>' +
            '<div class="shop-total-price" id="shop-total-' + idx + '" style="text-align:center;color:#ccc;font-size:0.85rem;margin-bottom:10px;">' + item.price.toLocaleString() + ' G</div>' +
            '<button class="btn-buy" onclick="buyItem(' + idx + ', this)">구매하기</button>' +
            '</div>';
    }).join('');

    // 하단에 1, 2, 3 페이지 버튼을 만들어줍니다.
    var pageEl = document.getElementById('shop-pagination-container');
    if (!pageEl) {
        pageEl = document.createElement('div');
        pageEl.id = 'shop-pagination-container';
        pageEl.style.cssText = 'display:flex;justify-content:center;gap:10px;margin-top:25px;width:100%;';
        container.parentNode.insertBefore(pageEl, container.nextSibling);
    }
    pageEl.innerHTML = totalPages > 1
        ? (function () {
            var s = '';
            for (var i = 1; i <= totalPages; i++)
                s += '<button class="shop-page-btn ' + (i === currentShopPage ? 'active' : '') + '" onclick="changeShopPage(' + i + ')">' + i + '</button>';
            return s;
          }())
        : '';
};

// '구매하기' 버튼을 눌렀을 때 돈을 빼고 내 가방에 물건을 넣어주는 함수입니다.
window.buyItem = async function (idx, btn) {
    if (!currentUser) return alert('로그인이 필요합니다.');
    var myCharId = charOwners[currentUser.email];
    if (!myCharId) return alert('캐릭터 권한이 없습니다.');

    var item = window.shopItems[idx];
    if (!item) return;

    var qtyEl = document.getElementById('shop-qty-' + idx);
    var qty   = parseInt((qtyEl && qtyEl.innerText) || '1', 10); // 몇 개를 살지
    var totalCost    = item.price * qty; // 총 얼마인지
    var originalText = btn.innerText;

    // 데이터베이스에서 내 돈을 확인합니다.
    var checkRes = await supabaseClient
        .from('character_profiles').select('money').eq('char_id', myCharId).eq('phase', 0).single();
    var checkMoney = (checkRes.data && checkRes.data.money)
        ? parseInt(String(checkRes.data.money).replace(/,/g, ''), 10) : 0;

    if (checkMoney < totalCost)
        return alert('소지금이 부족합니다!\n필요: ' + totalCost.toLocaleString() + ' G / 보유: ' + checkMoney.toLocaleString() + ' G');
    if (!confirm('[' + item.name + '] × ' + qty + '개\n총 ' + totalCost.toLocaleString() + ' G 결제하시겠습니까?')) return;

    btn.innerText = '결제중…'; btn.disabled = true;

    try {
        var fetchRes = await supabaseClient
            .from('character_profiles')
            .select('money, inventory, furniture_inventory, mailbox')
            .eq('char_id', myCharId).eq('phase', 0).single();
        if (fetchRes.error) throw fetchRes.error;
        var profile = fetchRes.data;

        var money = (profile && profile.money)
            ? parseInt(String(profile.money).replace(/,/g, ''), 10) : 0;

        // 일반 아이템이면 소지품에, 가구면 보관함에 넣습니다.
        var isFurnitureType = (item.type === 'furniture' || item.type === 'wallpaper' || item.type === 'floor');
        var targetCol = isFurnitureType ? 'furniture_inventory' : 'inventory';

        var targetArr = [];
        var rawInv = (profile && profile[targetCol]) || '';
        if (typeof rawInv === 'string' && rawInv.trim() !== '') {
            try { targetArr = JSON.parse(rawInv); } catch(e) { targetArr = []; }
        } else if (Array.isArray(rawInv)) {
            targetArr = rawInv.slice();
        }
        while (targetArr.length < 20) targetArr.push(null); // 가방이 모자라면 20칸까지 채워놓습니다.

        var mailArr = [];
        if (profile && profile.mailbox) {
            try { mailArr = typeof profile.mailbox === 'string' ? JSON.parse(profile.mailbox) : profile.mailbox; } catch(e) { mailArr = []; }
        }
        if (!Array.isArray(mailArr)) mailArr = [];

        money -= totalCost; // 돈을 뺍니다.
        var inInv = 0, inMail = 0;

        // 가방에 이미 똑같은 물건이 있는지 찾습니다.
        var existing = null;
        for (var i = 0; i < targetArr.length; i++) {
            if (targetArr[i] && targetArr[i].name === item.name) { existing = targetArr[i]; break; }
        }

        if (existing) {
            // 똑같은 게 있으면 개수만 더해줍니다.
            existing.count = (existing.count || 1) + qty;
            inInv += qty;
        } else {
            // 똑같은 게 없으면 빈칸을 찾아서 넣습니다.
            var emptyIdx = -1;
            for (var j = 0; j < targetArr.length; j++) {
                if (targetArr[j] === null || targetArr[j] === '') { emptyIdx = j; break; }
            }
            var newObj = { name: item.name, desc: item.desc || '', img: item.img || '', type: item.type || 'item', count: qty };
            
            // 벽지나 가구일 경우 추가 정보를 같이 넣어줍니다.
            if (item.type === 'wallpaper') {
                if (item.colorL) newObj.colorL = item.colorL;
                if (item.colorR) newObj.colorR = item.colorR;
                if (item.bgImg)  newObj.bgImg  = item.bgImg;
            }
            if (item.type === 'furniture') {
                if (item.width)  newObj.width  = item.width;
                if (item.height) newObj.height = item.height;
            }
            if (item.type === 'floor' && item.color) newObj.color = item.color;

            if (emptyIdx !== -1) { targetArr[emptyIdx] = newObj; inInv += qty; }
            else                 { mailArr.push(newObj);          inMail += qty; } // 빈칸이 없으면 우편함으로 쏴버립니다.
        }

        // DB에 저장하기 좋게 묶어줍니다.
        var updatePayload = { money: money };
        updatePayload[targetCol] = targetArr;
        if (inMail > 0) updatePayload.mailbox = mailArr;

        currentEditingId    = myCharId;
        currentEditingPhase = 0;
        var upsertRes = await upsertProfileData(updatePayload); // 서버에 저장!
        if (upsertRes && upsertRes.error) throw upsertRes.error;

        var msg = '[' + item.name + '] × ' + qty + '개 구매 완료!\n잔액: ' + money.toLocaleString() + ' G';
        if (inMail > 0) msg += '\n(가방 공간 부족 — 우편함으로 발송됨)';
        alert(msg);

        // 개수 카운터를 다시 1개로 초기화합니다.
        if (qtyEl) qtyEl.innerText = '1';
        var totalEl = document.getElementById('shop-total-' + idx);
        if (totalEl) totalEl.innerText = item.price.toLocaleString() + ' G';

        // 화면 윗부분의 소지금 글자도 새로고침합니다.
        if (typeof window.updateShopMoneyDisplay === 'function') await window.updateShopMoneyDisplay();
        if (typeof loadCharacterData === 'function') await loadCharacterData();

    } catch (err) {
        console.error('구매 에러:', err);
        alert('결제 오류 발생.');
    } finally {
        btn.innerText = originalText; btn.disabled = false;
    }
};


/* ================================================================= */
/* 3. 캘린더 (달력 기능)                                                */
/* ================================================================= */

// 왼쪽 사이드바에 달력을 예쁘게 그려주는 함수입니다.
async function buildCalendar() {
    var el = document.getElementById('calendar');
    if (!el) return;
    var current = new Date(); // 오늘 날짜를 기준으로 합니다.

    async function render() {
        // 서버에서 다른 사람들이 등록해 둔 일정 데이터를 가져옵니다.
        var res    = await supabaseClient.from('calendar_events').select('*');
        var events = {};
        if (res.data) res.data.forEach(function (d) { events[d.event_date] = [d.title, d.description]; });

        var y  = current.getFullYear(), m = current.getMonth();
        var td = new Date();
        var fd = new Date(y, m, 1).getDay(); // 이번 달 1일이 무슨 요일인지
        var ld = new Date(y, m + 1, 0).getDate(); // 이번 달이 며칠까지 있는지

        var cells = '';
        // 1일이 시작하기 전까지 빈칸을 그려줍니다.
        for (var i = 0; i < fd; i++) cells += '<div class="cal-day empty"></div>';
        
        // 날짜를 하나씩 채워 넣습니다.
        for (var d = 1; d <= ld; d++) {
            var ds = y + '-' + String(m + 1).padStart(2, '0') + '-' + String(d).padStart(2, '0');
            var ev = events[ds];
            
            // 2026년 5월 이후의 모든 일요일은 무조건 '정기 세션'이라고 기본으로 띄워줍니다.
            if (!ev && new Date(y, m, d).getDay() === 0 && new Date(y, m, d) >= new Date(2026, 4, 31))
                ev = ['정기 세션', '오후 7시'];

            cells +=
                '<div class="cal-day' +
                    (d === td.getDate() && m === td.getMonth() ? ' today' : '') + // 오늘 날짜엔 붉은빛 표시
                    (ev ? ' has-event' : '') + '"' + // 일정이 있는 날엔 표시
                    ' onclick="addEvent(\'' + ds + '\', ' + !!ev + ')">' +
                    d +
                    // 일정이 있는 날 마우스를 올리면 보이는 툴팁 설명창입니다.
                    (ev ? '<div class="cal-tooltip"><strong>' + ev[0] + '</strong><br>' + ev[1] + '</div>' : '') +
                '</div>';
        }

        // 전체 달력 HTML 조립
        el.innerHTML =
            '<div class="cal-header">' +
                '<div>' + y + '</div>' +
                '<div class="cal-nav">' +
                    '<button onclick="prevMonth()">&lt;</button>' +
                    '<span>' + (m + 1) + '月</span>' +
                    '<button onclick="nextMonth()">&gt;</button>' +
                '</div>' +
            '</div>' +
            '<div class="cal-grid">' +
                ['일','월','화','수','목','금','토'].map(function (d) { return '<div class="cal-dow">' + d + '</div>'; }).join('') +
                cells +
            '</div>';
    }

    // < > 화살표 버튼을 누르면 달을 넘겨줍니다.
    window.prevMonth  = function () { current = new Date(current.getFullYear(), current.getMonth() - 1, 1); render(); };
    window.nextMonth  = function () { current = new Date(current.getFullYear(), current.getMonth() + 1, 1); render(); };
    
    // 날짜 칸을 클릭하면 새 일정을 등록하는 팝업이 뜹니다.
    window.addEvent   = async function (d, hasEvent) {
        if (hasEvent) { await window.deleteEvent(d); return; } // 이미 일정이 있으면 삭제하겠냐고 묻습니다.
        var t = prompt('제목:');
        if (!t) return;
        var ds = prompt('내용:');
        var res = await supabaseClient.from('calendar_events')
            .insert([{ event_date: d, title: t, description: ds || ' ' }]);
        if (res.error) alert('저장 실패'); else buildCalendar();
    };
    
    // 일정을 삭제하는 함수입니다.
    window.deleteEvent = async function (date) {
        if (confirm('일정을 삭제하시겠습니까?')) {
            var res = await supabaseClient.from('calendar_events').delete().eq('event_date', date);
            if (res.error) alert('삭제 실패'); else buildCalendar();
        }
    };

    render();
}


/* ================================================================= */
/* 4. 미니게임 (놀음판 탭 전환 및 소지금 관리)                            */
/* ================================================================= */

// 동전 던지기 / 야바위 / 사냥터 탭을 누를 때 화면을 바꿔주는 함수입니다.
window.changeMiniGame = function (btn, idx) {
    var sec = document.getElementById('MiniGames');
    sec.querySelectorAll('.phase-btn').forEach(function (t) { t.classList.remove('active'); });
    sec.querySelectorAll('.mg-slide').forEach(function (s) { s.classList.remove('active'); });
    btn.classList.add('active');
    sec.querySelectorAll('.mg-slide')[idx].classList.add('active');
    
    if (idx === 1) initShellPositions(); // 야바위 탭을 열면 야바위 컵들 위치를 정렬해줍니다.
    _refreshMiniGameMoneyDisplay(); // 내 소지금 글씨를 새로고침합니다.
};

// 게임용 소지금을 서버에서 긁어와 표시해주는 안전한 보조 함수입니다.
async function _refreshMiniGameMoneyDisplay() {
    if (!currentUser) return;
    var myCharId = charOwners[currentUser.email];
    if (!myCharId) return;
    var res = await supabaseClient
        .from('character_profiles').select('money')
        .eq('char_id', myCharId).eq('phase', 0).single();
    var money = (res.data && res.data.money) ? parseInt(res.data.money) : 0;
    var el = document.getElementById('minigame-my-money');
    if (el) el.innerText = money.toLocaleString() + ' G';
}
window.updateMiniGameMoneyDisplay = _refreshMiniGameMoneyDisplay;


/* ================================================================= */
/* 5. 동전 던지기 게임                                                 */
/* ================================================================= */

var isTossing = false; // 동전이 돌아가고 있는지 확인하는 장치입니다.

// '앞면 걸기' 또는 '뒷면 걸기' 버튼을 누르면 시작되는 함수입니다.
window.playCoinToss = async function (guess) {
    if (isTossing) return; // 이미 동전이 돌고 있으면 무시합니다.
    var bet = parseInt(document.getElementById('cointoss-bet').value);
    if (isNaN(bet) || bet <= 0) return alert('판돈을 1 G 이상 걸어주세요!');
    if (bet > currentMoney)     return alert('소지금이 부족합니다!');
    if (!currentUser)           return alert('로그인이 필요합니다.');

    isTossing = true;
    var coin       = document.getElementById('coin-element');
    var resultText = document.getElementById('cointoss-result');
    document.getElementById('btn-guess-heads').disabled = true; // 게임 중엔 버튼을 못 누르게 막습니다.
    document.getElementById('btn-guess-tails').disabled = true;
    
    resultText.innerText  = '동전이 돌아갑니다…!';
    resultText.style.color = '#fff';
    coin.innerText = '';
    
    // 동전이 뱅글뱅글 도는 CSS 애니메이션을 강제로 껐다 켜서 확실히 돌게 합니다.
    coin.classList.remove('coin-flipping');
    void coin.offsetWidth;
    coin.classList.add('coin-flipping');

    // 1.5초 뒤에 결과가 나옵니다.
    setTimeout(async function () {
        try {
            var outcome = Math.random() < 0.5 ? 'heads' : 'tails'; // 50% 확률
            coin.innerText = outcome === 'heads' ? '앞' : '뒤';
            coin.className = outcome === 'heads' ? 'coin' : 'coin silver'; // 뒷면이면 은색으로 바뀝니다.

            var newMoney = currentMoney;
            if (guess === outcome) {
                newMoney += bet;
                resultText.innerText  = '적중! ' + bet.toLocaleString() + ' G 획득!';
                resultText.style.color = '#4caf50';
            } else {
                newMoney -= bet;
                resultText.innerText  = '실패… ' + bet.toLocaleString() + ' G를 잃었습니다.';
                resultText.style.color = '#ff4d4d';
            }

            // 결과를 서버에 저장합니다.
            currentEditingId    = charOwners[currentUser.email];
            currentEditingPhase = 0;
            var res = await upsertProfileData({ money: newMoney });
            if (res && res.error) alert('결과 저장 실패');
            else {
                currentMoney = newMoney;
                await _refreshMiniGameMoneyDisplay();
                if (typeof loadCharacterData === 'function') await loadCharacterData();
            }
        } finally {
            // 결과 처리 후 다시 버튼을 누를 수 있게 풀어줍니다.
            isTossing = false;
            document.getElementById('btn-guess-heads').disabled = false;
            document.getElementById('btn-guess-tails').disabled = false;
            coin.classList.remove('coin-flipping');
        }
    }, 1500);
};


/* ================================================================= */
/* 6. 야바위 게임 (컵 섞기)                                            */
/* ================================================================= */

var shellState      = 'idle'; // idle(대기), shuffling(섞는중), resolving(결과 확인 중)
var shellWinningCup = -1;     // 공이 들어있는 정답 컵 번호
var shellBetAmount  = 0;      // 내가 건 돈
var cupPositions    = [0, 1, 2]; // 컵들이 어느 자리에 있는지 기억하는 배열
var CUP_X           = [0, 120, 240]; // 컵들이 화면 어디에 위치할지 픽셀 단위로 기억하는 배열

// 모니터 크기가 바뀔 때마다 컵들의 자리를 중앙으로 예쁘게 모아주는 함수입니다.
function initShellPositions() {
    var board = document.getElementById('shell-board');
    if (!board) return;
    var cw   = board.clientWidth;
    var cupW = (document.getElementById('cup-wrap-0') || {}).clientWidth || 80;
    var gap  = (cw - cupW * 3) / 2; // 남는 공간을 반으로 나눠서 가운데 정렬
    CUP_X        = [0, cupW + gap, (cupW + gap) * 2];
    cupPositions = [0, 1, 2];
    [0, 1, 2].forEach(function (i) {
        document.getElementById('cup-wrap-' + i).style.transform = 'translate(' + CUP_X[i] + 'px, 0px)';
    });
}
window.addEventListener('resize', initShellPositions);

// '게임 시작하기' 버튼을 누르면 실행되는 함수입니다.
window.startShellGame = async function () {
    if (shellState !== 'idle') return; // 게임 중엔 버튼 못 누르게 막음
    var bet = parseInt(document.getElementById('shell-bet').value);
    if (isNaN(bet) || bet <= 0) return alert('판돈을 1 G 이상 걸어주세요!');
    if (bet > currentMoney)     return alert('소지금이 부족합니다!');
    if (!currentUser)           return alert('로그인이 필요합니다.');

    // 참가비 먼저 빼가기
    currentMoney  -= bet;
    shellBetAmount = bet;
    document.getElementById('minigame-my-money').innerText = currentMoney.toLocaleString() + ' G';
    shellState = 'shuffling';

    var resultText = document.getElementById('shell-result');
    var cups       = document.querySelectorAll('.shell-cup');
    var balls      = document.querySelectorAll('.shell-ball');
    var wrappers   = [0, 1, 2].map(function (i) { return document.getElementById('cup-wrap-' + i); });

    cups.forEach(function (c)  { c.classList.remove('revealed'); }); // 컵 뚜껑 다 덮기
    balls.forEach(function (b) { b.classList.remove('winner'); });  // 기존 공 지우기
    
    // 정답 컵을 무작위로 하나 고릅니다.
    shellWinningCup = Math.floor(Math.random() * 3);
    document.getElementById('shell-ball-' + shellWinningCup).classList.add('winner');

    // 1. 공이 어디에 들어갔는지 살짝 보여줍니다.
    resultText.innerText  = '공을 넣습니다. 잘 보세요!';
    resultText.style.color = 'var(--accent-color)';
    document.getElementById('cup-' + shellWinningCup).classList.add('revealed'); // 정답 컵 열기
    await new Promise(function (r) { setTimeout(r, 1200); });
    document.getElementById('cup-' + shellWinningCup).classList.remove('revealed'); // 닫기
    await new Promise(function (r) { setTimeout(r, 600); });

    // 2. 본격적으로 컵 섞기 시작!
    resultText.innerText = '섞습니다!'; resultText.style.color = '#fff';

    var shuffleCount = 25, speed = 350;
    // 25번을 섞는데, 갈수록 섞는 속도가 점점 빨라집니다.
    for (var i = 0; i < shuffleCount; i++) {
        if (i > 5)  speed = 200;
        if (i > 10) speed = 120;
        if (i > 15) speed = 70; // 눈에 안 보일 정도로 빨라짐!
        wrappers.forEach(function (w) { w.style.transition = 'transform ' + speed + 'ms ease-in-out'; });

        // 랜덤으로 두 개의 자리를 골라서 서로 바꿉니다.
        var posA = Math.floor(Math.random() * 3);
        var posB = Math.floor(Math.random() * 3);
        while (posA === posB) posB = Math.floor(Math.random() * 3); // 서로 다른 자리일 때까지 뽑음

        var cupIdxA = cupPositions.indexOf(posA);
        var cupIdxB = cupPositions.indexOf(posB);
        cupPositions[cupIdxA] = posB; cupPositions[cupIdxB] = posA; // 배열 안의 기억된 자리 바꿈
        
        // 시각적으로도 부딪히지 않게 하나는 위로, 하나는 아래로 피해서 휙 지나가게 만듭니다.
        wrappers[cupIdxA].style.zIndex    = 10; wrappers[cupIdxB].style.zIndex = 5;
        wrappers[cupIdxA].style.transform = 'translate(' + CUP_X[posB] + 'px, -20px)';
        wrappers[cupIdxB].style.transform = 'translate(' + CUP_X[posA] + 'px, 20px)';
        await new Promise(function (r) { setTimeout(r, speed / 2); });
        
        // 제자리에 내려놓기
        wrappers[cupIdxA].style.transform = 'translate(' + CUP_X[posB] + 'px, 0px)';
        wrappers[cupIdxB].style.transform = 'translate(' + CUP_X[posA] + 'px, 0px)';
        await new Promise(function (r) { setTimeout(r, speed / 2 + 10); });
    }

    // 섞기가 다 끝나면 깔끔하게 제자리에 정렬해줍니다.
    wrappers.forEach(function (w, idx) {
        w.style.transition = 'transform 300ms ease';
        w.style.transform  = 'translate(' + CUP_X[cupPositions[idx]] + 'px, 0px)';
        w.style.zIndex     = 1;
    });
    await new Promise(function (r) { setTimeout(r, 300); });

    // 플레이어가 컵을 누를 수 있게 풀어줍니다.
    resultText.innerText  = '공이 들어있는 컵을 선택하세요!';
    resultText.style.color = 'var(--accent-color)';
    shellState = 'waiting';
};

// 유저가 컵 하나를 클릭했을 때 정답을 확인하는 함수입니다.
window.guessShellCup = async function (selectedCupIdx) {
    if (shellState !== 'waiting') return; // 게임이 다 섞이지 않았으면 무시함
    shellState = 'resolving';

    var myCharId   = charOwners[currentUser.email];
    var resultText = document.getElementById('shell-result');
    var cups       = document.querySelectorAll('.shell-cup');
    
    // 컵 세 개를 몽땅 다 들어 올려서 보여줍니다.
    cups.forEach(function (c) { c.classList.add('revealed'); });

    // 정답을 맞췄다면 건 돈의 3배를 줍니다!
    if (selectedCupIdx === shellWinningCup) {
        var winAmount = shellBetAmount * 3;
        currentMoney += winAmount;
        resultText.innerText  = '정답! ' + winAmount.toLocaleString() + ' G 획득!';
        resultText.style.color = '#4caf50';
    } else {
        resultText.innerText  = '꽝! 빈 컵입니다.';
        resultText.style.color = '#ff4d4d';
    }

    // 결과를 서버에 저장합니다.
    currentEditingId    = myCharId;
    currentEditingPhase = 0;
    await upsertProfileData({ money: currentMoney });
    await _refreshMiniGameMoneyDisplay();
    if (typeof loadCharacterData === 'function') await loadCharacterData();

    // 3초 뒤에 처음 상태로 깨끗하게 돌려놓습니다.
    setTimeout(function () {
        shellState            = 'idle';
        resultText.innerText  = '베팅하고 게임을 시작하세요!';
        resultText.style.color = 'var(--text-main)';
        cups.forEach(function (c) { c.classList.remove('revealed'); });
    }, 3000);
};


/* ================================================================= */
/* 7. 사냥터 게임 (마우스 클릭 게임)                                   */
/* ================================================================= */

var huntScore         = 0; // 몇 마리 잡았는지
var huntMoneyEarned   = 0; // 얼마를 벌었는지
var huntTimer         = 0; // 남은 시간(초)
var huntInterval      = null; // 초침 똑딱이
var huntSpawnInterval = null; // 동물 생성기

// '사냥 시작하기' 버튼을 누르면 실행되는 함수입니다.
window.startHuntingGame = function () {
    if (!currentUser) return alert('로그인이 필요합니다.');
    var myCharId = charOwners[currentUser.email];
    if (!myCharId) return alert('캐릭터 권한이 없습니다.');

    // 버튼을 막 눌러서 초침이 여러 개 도는 것을 방지합니다.
    if (huntInterval)      clearInterval(huntInterval);
    if (huntSpawnInterval) clearInterval(huntSpawnInterval);

    var btn  = document.getElementById('btn-start-hunt');
    var area = document.getElementById('hunt-area');
    btn.disabled  = true; btn.innerText = '사냥 진행 중…'; // 버튼 잠금
    
    // 점수와 시간을 초기화합니다.
    huntScore         = 0; 
    huntMoneyEarned   = 0; 
    huntTimer         = 15; // 15초 동안 사냥합니다.
    document.getElementById('hunt-score').innerText = huntMoneyEarned;
    document.getElementById('hunt-timer').innerText = huntTimer;
    area.innerHTML = ''; // 화면에 남아있던 동물을 싹 지웁니다.
    void area.offsetWidth;

    // 1초마다 남은 시간을 1초씩 줄이는 초침 똑딱이입니다.
    huntInterval = setInterval(function () {
        huntTimer--;
        document.getElementById('hunt-timer').innerText = huntTimer;
        // 시간이 다 되면 게임을 끝냅니다.
        if (huntTimer <= 0) endHuntingGame(myCharId);
    }, 1000);

    // 0.7초마다 사냥감(사슴이나 곰)을 무작위로 계속 만들어내는 기계입니다.
    setTimeout(function () {
        if (huntTimer > 0) spawnTarget(area);
        huntSpawnInterval = setInterval(function () { spawnTarget(area); }, 700);
    }, 200);
};

// 동물을 만들어서 화면 아무 곳에나 띄우는 함수입니다.
function spawnTarget(area) {
    if (huntTimer <= 0) return;

    // 20%의 확률로 곰이 나오고, 80% 확률로 사슴이 나옵니다.
    var isBear = Math.random() < 0.2;
    var size   = isBear ? 84 : 64;   // 곰은 사슴보다 큽니다.
    var reward = isBear ? 50 : 10;   // 곰은 돈을 더 많이 줍니다.
    var emoji  = isBear ? '곰' : '사슴';
    var lifeMs = isBear ? 1400 : 1100; // 곰이 화면에 더 오래 남아있습니다.

    // 동물이 튀어나올 공간의 넓이를 계산합니다.
    var areaW = area.clientWidth, areaH = area.clientHeight;
    if (areaW === 0 || areaH === 0) {
        var rect = area.getBoundingClientRect();
        areaW = rect.width  || 800;
        areaH = rect.height || 380;
    }

    var target    = document.createElement('div');
    target.className = 'hunt-target ' + (isBear ? 'bear' : 'deer');
    target.textContent = emoji;
    
    // 화면 범위 내에서 가로 세로 아무 데나 무작위로 놓습니다.
    target.style.left  = (10 + Math.floor(Math.random() * Math.max(10, areaW - size - 10))) + 'px';
    target.style.top   = (10 + Math.floor(Math.random() * Math.max(10, areaH - size - 10))) + 'px';

    // 내가 곰이나 사슴을 마우스로 '클릭'했을 때의 반응입니다.
    target.onclick = function () {
        if (target.classList.contains('hit')) return; // 이미 때린 건 무시
        target.classList.add('hit'); // 때렸다고 도장 찍기
        target.textContent = '+' + reward + 'G'; // 글씨가 돈으로 바뀝니다!
        
        // 내 점수판에 돈을 차곡차곡 쌓습니다.
        huntScore++;
        huntMoneyEarned += reward;
        document.getElementById('hunt-score').innerText = huntMoneyEarned;
        
        // 돈 글씨를 0.4초 보여주고 동물을 화면에서 없애버립니다.
        setTimeout(function () { if (area.contains(target)) target.remove(); }, 400);
    };

    area.appendChild(target); // 동물을 화면에 투입!
    
    // 아무도 안 때리고 구경만 하면, 일정 시간(lifeMs)이 지난 후 스스로 사라집니다. (도망침)
    setTimeout(function () {
        if (area.contains(target) && !target.classList.contains('hit')) target.remove();
    }, lifeMs);
}

// 15초가 지나 게임이 완전히 끝났을 때 벌어들인 돈을 저장하는 함수입니다.
async function endHuntingGame(myCharId) {
    clearInterval(huntInterval); clearInterval(huntSpawnInterval); // 시계와 동물 기계 끄기
    huntInterval = null; huntSpawnInterval = null;

    var area = document.getElementById('hunt-area');
    area.innerHTML =
        '<div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);' +
        'color:var(--accent-color);font-size:1.5rem;font-weight:bold;' +
        'background:rgba(0,0,0,0.7);padding:10px 20px;border-radius:10px;">사냥 종료!</div>';

    var btn = document.getElementById('btn-start-hunt');
    alert('사냥 종료!\n총 ' + huntScore + '마리 사냥 → ' + huntMoneyEarned.toLocaleString() + ' G 획득');

    // 한 푼이라도 벌었으면 데이터베이스에 내 소지금으로 저장합니다.
    if (huntMoneyEarned > 0) {
        btn.innerText = '보상 획득 중…';
        currentEditingId    = myCharId;
        currentEditingPhase = 0;
        var res = await upsertProfileData({ money: currentMoney + huntMoneyEarned });
        if (!res || !res.error) {
            currentMoney += huntMoneyEarned;
            await _refreshMiniGameMoneyDisplay();
            if (typeof loadCharacterData === 'function') await loadCharacterData();
        }
    }
    btn.innerText = '사냥 다시 시작하기'; btn.disabled = false; // 버튼 원상복구
}


/* ================================================================= */
/* 8. 증권 거래소 (주식 시스템)                                       */
/* ================================================================= */

var _stockChart    = null;   // 주식 차트 그림판을 기억하는 변수
var _stockHistory  = { labels: [], samsung: [], sk: [] }; // 차트의 꺾은선 데이터를 기록하는 메모장
var _stockInited   = false;  // 주식 시스템이 두 번 실행되지 않게 막는 자물쇠

// 주식 시장이 처음 열렸을 때의 기본 1주당 가격입니다.
var _localPrices = { samsung: 74000, sk: 165000 };

// 시간에 따라 주가가 오르거나 내리는 '흐름(트렌드)'을 조종하는 변수들입니다.
var _stockTickCount = 0; 
var _marketTrend = { 
    samsung: (Math.random() < 0.5 ? 1 : -1), // 1은 상승장, -1은 하락장 기조
    sk: (Math.random() < 0.5 ? 1 : -1) 
};

// 웹페이지가 열리면 제일 먼저 차트를 그리고 주식 시장을 여는 함수입니다.
function initStockSystem() {
    if (_stockInited) return;
    _stockInited = true;

    var canvas = document.getElementById('stockChart');
    if (!canvas || typeof Chart === 'undefined') return;
    var ctx = canvas.getContext('2d');

    // 차트 아래쪽을 예쁘게 칠해주는 그라데이션 색상입니다.
    var gradS = ctx.createLinearGradient(0, 0, 0, 250);
    gradS.addColorStop(0, 'rgba(255, 77, 77, 0.4)');
    gradS.addColorStop(1, 'rgba(255, 77, 77, 0.0)');
    var gradK = ctx.createLinearGradient(0, 0, 0, 250);
    gradK.addColorStop(0, 'rgba(76, 139, 245, 0.4)');
    gradK.addColorStop(1, 'rgba(76, 139, 245, 0.0)');

    // 자바스크립트용 'Chart.js' 기능을 가져와서 꺾은선 그래프를 만듭니다.
    _stockChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: _stockHistory.labels,
            datasets: [
                { label: '★종목A (A-기업)',      borderColor: '#ff4d4d', backgroundColor: gradS, data: _stockHistory.samsung, borderWidth: 2, tension: 0.2, fill: true, pointRadius: 2, pointBackgroundColor: '#ff4d4d' },
                { label: '★종목B (B-기업)', borderColor: '#4c8bf5', backgroundColor: gradK, data: _stockHistory.sk,      borderWidth: 2, tension: 0.2, fill: true, pointRadius: 2, pointBackgroundColor: '#4c8bf5' },
            ],
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            animation: { duration: 400, easing: 'linear' },
            plugins: {
                legend:  { labels: { color: '#ccc', font: { family: 'Nanum Myeongjo' } } },
                tooltip: { mode: 'index', intersect: false }, // 마우스 올리면 가격 나오는 기능
            },
            scales: {
                x: { ticks: { color: '#666', maxTicksLimit: 10 }, grid: { display: false } },
                y: { ticks: { color: '#888' }, grid: { color: 'rgba(255,255,255,0.05)' } }, // 뒷배경 가로선
            },
        },
    });

    setInterval(_tickStock, 3000); // 3초마다 주가를 변동시키는 함수를 실행합니다!
    _tickStock(); // 시작하자마자 한 번 바로 실행
    _loadMyHoldings(); // 내가 몇 주나 가지고 있는지 불러오기
}

// 진짜 변동하는 주가를 가져오는 보조 함수입니다.
function _getActivePrices() {
    return (window.currentPrices && window.currentPrices.samsung)
        ? window.currentPrices
        : _localPrices;
}

// 3초마다 주식 시장이 살아 움직이게(주가가 오르내리게) 만드는 핵심 엔진입니다!
function _tickStock() {
    var prices = _getActivePrices();
    var now    = new Date();
    // 차트 밑에 달릴 시간 글자 (예: 14:05)
    var label  = String(now.getMinutes()).padStart(2, '0') + ':' + String(now.getSeconds()).padStart(2, '0');

    // 만약 중앙 통제 서버 가격이 없다면, 내 컴퓨터에서 혼자서라도 주가를 올리고 내립니다.
    if (!window.currentPrices || !window.currentPrices.samsung) {
        
        _stockTickCount++; // 3초가 지날 때마다 틱이 1씩 쌓입니다.

        // 1. [2시간마다] 주식 시장의 기조(트렌드)가 상승장인지 하락장인지 아예 바뀝니다. (3초 * 2400틱 = 7200초 = 2시간)
        if (_stockTickCount % 2400 === 0) {
            _marketTrend.samsung = Math.random() < 0.5 ? 1 : -1;
            _marketTrend.sk      = Math.random() < 0.5 ? 1 : -1;
        }

        // 2. [3초마다] 평소에는 잔잔하게 -1% ~ +1% 사이를 오르락내리락 합니다. 기조가 상승장이면 위로 아주 살짝 더 쏠립니다.
        var samChange = (Math.random() * 0.02 - 0.01) + (_marketTrend.samsung * 0.005);
        var skChange  = (Math.random() * 0.02 - 0.01) + (_marketTrend.sk * 0.005);

        // 3. [30분마다] 갑자기 엄청난 떡상이나 떡락 이벤트가 발생합니다! (3초 * 600틱 = 1800초 = 30분)
        if (_stockTickCount % 600 === 0) {
            // 70% 확률로 현재 기조를 따라 폭등/폭락하고, 30% 확률로 반대로 튑니다.
            var samEventDir = Math.random() < 0.7 ? _marketTrend.samsung : -_marketTrend.samsung;
            var skEventDir  = Math.random() < 0.7 ? _marketTrend.sk      : -_marketTrend.sk;
            
            // 한 번에 무려 20% ~ 50% 까지 주가가 미친 듯이 바뀝니다.
            samChange = samEventDir * (Math.random() * 0.30 + 0.20); 
            skChange  = skEventDir  * (Math.random() * 0.30 + 0.20);
        }

        // 4. 최종적으로 바뀐 가격을 적용합니다. 단, 주식이 휴지조각이 되는 걸 막기 위해 최소 가격은 1000 G로 보호해줍니다.
        _localPrices.samsung = Math.max(1000, Math.floor(_localPrices.samsung * (1 + samChange)));
        _localPrices.sk      = Math.max(1000, Math.floor(_localPrices.sk      * (1 + skChange)));
    }

    // 새 가격을 차트 메모장에 적어둡니다.
    _stockHistory.labels.push(label);
    _stockHistory.samsung.push(prices.samsung);
    _stockHistory.sk.push(prices.sk);
    
    // 차트 화면이 너무 길어지지 않게 최근 25개의 꺾은선만 남기고 오래된 건 쳐냅니다.
    if (_stockHistory.labels.length > 25) {
        _stockHistory.labels.shift();
        _stockHistory.samsung.shift();
        _stockHistory.sk.shift();
    }

    // 화면의 그림(차트)을 최신화합니다!
    if (_stockChart) _stockChart.update();

    // 화면에 적힌 '현재가: 0000 G' 숫자 글씨도 최신화합니다.
    var sEl = document.getElementById('price-samsung');
    var kEl = document.getElementById('price-sk');
    if (sEl) sEl.innerText = prices.samsung.toLocaleString() + ' G';
    if (kEl) kEl.innerText = prices.sk.toLocaleString()      + ' G';
}

// 내가 주식을 몇 주나 들고 있는지 데이터베이스에서 가져오는 함수입니다.
async function _loadMyHoldings() {
    if (!currentUser || !supabaseClient) return;
    var myCharId = charOwners[currentUser.email];
    if (!myCharId) return;
    var res = await supabaseClient
        .from('character_profiles').select('stocks')
        .eq('char_id', myCharId).eq('phase', 0).single();
    
    if (res.data && res.data.stocks) {
        var parsed = typeof res.data.stocks === 'string' ? JSON.parse(res.data.stocks) : res.data.stocks;
        window.myHoldings = parsed; // 내 주식 가방에 집어넣음
    }
    window.updateStockUI();
}

// 화면 상단에 내 주식 보유량을 글씨로 표시해주는 함수입니다.
window.updateStockUI = function () {
    var display = document.getElementById('stock-holdings-display');
    var h = window.myHoldings || { samsung: 0, sk: 0 };
    if (display)
        display.innerText = '★종목A ' + (h.samsung || 0) + '주 / ★종목B ' + (h.sk || 0) + '주';
};

// 매수(사기) 또는 매도(팔기) 버튼을 눌렀을 때 거래를 처리하는 함수입니다.
window.tradeStock = async function (corp, action) {
    if (!currentUser) return alert('로그인이 필요합니다.');
    var myCharId = charOwners[currentUser.email];
    if (!myCharId) return alert('캐릭터 권한이 없습니다.');

    var prices = (typeof _getActivePrices === 'function') ? _getActivePrices() : window.currentPrices;
    
    if (!prices || !prices[corp]) return alert('가격 정보를 불러올 수 없습니다. 잠시 후 다시 시도해주세요.');

    var corpName = corp === 'samsung' ? '★종목A' : '★종목B';
    var price    = prices[corp]; // 현재 1주당 얼만지 확인

    // 팝업창을 띄워 사용자에게 몇 주나 거래할 건지 숫자를 입력받습니다.
    var qtyStr = prompt(
        action === 'buy'
            ? '[' + corpName + '] 매수할 주 수\n현재가: ' + price.toLocaleString() + ' G/주'
            : '[' + corpName + '] 매도할 주 수',
        '1'
    );
    if (!qtyStr) return; // 취소 누르면 종료
    var qty = parseInt(qtyStr);
    if (isNaN(qty) || qty < 1) return alert('올바른 수량을 입력하세요.');

    // 내 지갑 사정과 현재 보유 주식을 서버에서 다시 최신으로 가져와서 확인합니다. (사기 방지)
    var fetchRes = await supabaseClient
        .from('character_profiles').select('money, stocks')
        .eq('char_id', myCharId).eq('phase', 0).single();

    var myMoney  = (fetchRes.data && fetchRes.data.money)
        ? parseInt(String(fetchRes.data.money).replace(/,/g, ''), 10) : 0;
    var holdings = { samsung: 0, sk: 0 };
    
    if (fetchRes.data && fetchRes.data.stocks) {
        holdings = typeof fetchRes.data.stocks === 'string'
            ? JSON.parse(fetchRes.data.stocks) : fetchRes.data.stocks;
    }
    window.myHoldings = holdings;

    var total = price * qty; // 총 거래 대금 계산

    // 주식을 살 때 (매수)
    if (action === 'buy') {
        if (myMoney < total) // 돈이 모자라면 막습니다.
            return alert('소지금 부족!\n필요: ' + total.toLocaleString() + ' G / 보유: ' + myMoney.toLocaleString() + ' G');
        myMoney -= total; // 내 돈을 깎고
        holdings[corp] = (holdings[corp] || 0) + qty; // 주식을 늘려줍니다.
        alert('[' + corpName + '] ' + qty + '주 매수 완료\n합계: ' + total.toLocaleString() + ' G\n잔액: ' + myMoney.toLocaleString() + ' G');
    } 
    // 주식을 팔 때 (매도)
    else {
        var held = holdings[corp] || 0;
        if (held < qty) // 가진 주식보다 많이 팔려고 하면 막습니다.
            return alert('보유 주식 부족!\n보유: ' + held + '주 / 매도 요청: ' + qty + '주');
        myMoney += total; // 판 돈을 내 지갑에 넣고
        holdings[corp] = held - qty; // 내 주식을 깎습니다.
        alert('[' + corpName + '] ' + qty + '주 매도 완료\n합계: +' + total.toLocaleString() + ' G\n잔액: ' + myMoney.toLocaleString() + ' G');
    }

    // 거래가 성공적으로 끝났으니, 최종 정보를 데이터베이스에 덮어써서 기록합니다.
    window.myHoldings = holdings;
    currentEditingId    = myCharId;
    currentEditingPhase = 0;
    var saveRes = await upsertProfileData({ money: myMoney, stocks: JSON.stringify(holdings) });
    
    if (saveRes && saveRes.error) {
        alert('거래 처리 중 오류가 발생했습니다.');
    } else {
        window.updateStockUI(); // 보유 주식 글씨를 새로고침합니다.
        if (typeof updateShopMoneyDisplay === 'function') updateShopMoneyDisplay(); // 내 소지금 글씨도 새로고침합니다.
    }
};


/* ================================================================= */
/* 9. 낚시 게임                                                       */
/*                                                                   */
/* 사용 방법:                                                         */
/*   미니게임 탭의 '낚시' 버튼을 누르면 진입합니다.                    */
/*   낚시터를 선택한 뒤, 버튼을 꾹 눌러서 초록색 포획 영역 안에       */
/*   물고기 이미지를 가두면 됩니다. 진행 바가 100%가 되면 성공입니다.  */
/*                                                                   */
/* ★ 난이도별 보상 조정:                                              */
/*   endFishingGame 함수 안의 minReward / maxReward 값을 바꾸세요.    */
/*   예) 잔잔한 호수 성공 시 100~500G 지급                            */
/*       거친 바다 성공 시 300~1000G 지급                             */
/*                                                                   */
/* ★ 물고기 속도 조정:                                                */
/*   prepareFishing 함수의 currentFishSpeedBase 값을 바꾸세요.        */
/*   숫자가 클수록 물고기가 빠르게 움직입니다.                         */
/*   easy: 10 / hard: 22 (기본값)                                    */
/* ================================================================= */

/* 낚시 게임 내부 상태 변수들 — 직접 수정하지 마세요 */
var fishingActive       = false;   // 게임 진행 중 여부
var fishingFishY        = 120;     // 물고기 현재 Y 위치(픽셀)
var fishingFishSpeed    = 0;       // 물고기 이동 속도
var fishingPlayerY      = 0;       // 포획 영역 현재 Y 위치
var fishingPlayerVelocity = 0;     // 포획 영역 이동 속도
var fishingProgress     = 20;      // 진행 바 값 (0~100)
var isPressingFishingBtn = false;  // 버튼을 누르고 있는지 여부
var fishingAnimationFrame;         // requestAnimationFrame 핸들

var WATER_HEIGHT    = 300;         // 낚시 영역 높이(px)
var FISH_HEIGHT     = 35;          // 물고기 이미지 크기(px) — 고정
var PLAYER_HEIGHT   = 100;         // 포획 영역 높이(px) — 난이도에 따라 달라짐

/* 현재 선택된 난이도 설정 */
var currentDifficulty    = 'easy';
var currentFishSpeedBase = 10;

/* 버튼 누르기/떼기 이벤트 핸들러 (마우스 & 터치 모두 지원) */
window.pressFishingBtn  = function (e) {
    if (fishingActive) { e.preventDefault(); isPressingFishingBtn = true; }
};
window.releaseFishingBtn = function (e) {
    if (fishingActive) { e.preventDefault(); isPressingFishingBtn = false; }
};

/*
낚시터 선택 후 게임 초기화

difficulty : 'easy' (잔잔한 호수) | 'hard' (거친 바다)

★ 낚시터 배경 이미지 변경 방법:
  아래 waterArea.style.backgroundImage 의 URL을 원하는 이미지로 교체하세요.
  easy  → 잔잔한 호수 배경
  hard  → 거친 바다 배경
*/
window.prepareFishing = function (difficulty) {
    if (!currentUser) return alert('로그인이 필요합니다.');
    var myCharId = charOwners[currentUser.email];
    if (!myCharId) return alert('캐릭터 권한이 없습니다.');

    currentDifficulty = difficulty;

    var waterArea = document.getElementById('fishing-water-area');
    var playerBar = document.getElementById('player-bar');

    if (difficulty === 'easy') {
        PLAYER_HEIGHT        = 100;  // 포획 영역이 넓어서 쉬움
        currentFishSpeedBase = 10;   // 물고기 속도 느림
        // ★ 잔잔한 호수 배경 이미지 URL
        waterArea.style.backgroundImage = "url('https://images.unsplash.com/photo-1543165365-07232e8b2ed3?w=400')";
    } else {
        PLAYER_HEIGHT        = 60;   // 포획 영역이 좁아서 어려움
        currentFishSpeedBase = 22;   // 물고기 속도 빠름
        // ★ 거친 바다 배경 이미지 URL
        waterArea.style.backgroundImage = "url('https://images.unsplash.com/photo-1498654077810-12c21d4d6dc3?w=400')";
    }

    /* 포획 영역 높이를 난이도에 맞게 적용 */
    playerBar.style.height = PLAYER_HEIGHT + 'px';

    /* 메뉴 → 게임 화면 전환 */
    document.getElementById('fishing-menu').style.display = 'none';
    document.getElementById('fishing-play').style.display = 'block';

    startFishingLogic(myCharId);
};

/* 게임 상태 초기화 후 애니메이션 루프 시작 */
function startFishingLogic(myCharId) {
    var actionBtn   = document.getElementById('fishing-action-btn');
    var gameMessage = document.getElementById('fishing-message');

    /* 상태 변수 초기화 */
    fishingProgress        = 20;
    fishingFishY           = 120;
    fishingPlayerY         = 0;
    fishingPlayerVelocity  = 0;
    isPressingFishingBtn   = false;
    fishingActive          = true;

    gameMessage.innerHTML  = '버튼을 꾹 눌러 물고기를<br>포획 영역(초록 박스) 안에 가두세요!';
    gameMessage.style.color = '#fff';
    actionBtn.innerText    = '누르기 (Hold)';
    actionBtn.disabled     = false;

    cancelAnimationFrame(fishingAnimationFrame); // 이전 루프가 남아있으면 취소
    updateFishingGame(myCharId);
}

/*
매 프레임마다 실행되는 게임 루프

계산 순서:
  1. 물고기 불규칙 이동 (랜덤하게 방향과 속도 변경)
  2. 버튼 입력에 따른 포획 영역 물리 이동
  3. 충돌 판정 (물고기가 포획 영역 안에 있는지)
  4. 진행 바 증감
  5. 화면 업데이트
  6. 승패 판정
*/
function updateFishingGame(myCharId) {
    if (!fishingActive) return;

    var fishZone    = document.getElementById('fish-zone');
    var playerBar   = document.getElementById('player-bar');
    var progressBar = document.getElementById('progress-bar');

    /* ── 1. 물고기 이동 (5% 확률로 방향 전환) ── */
    if (Math.random() < 0.05) {
        fishingFishSpeed = (Math.random() - 0.5) * currentFishSpeedBase;
    }
    fishingFishY += fishingFishSpeed;

    /* 물고기가 위/아래 경계를 벗어나면 반대로 튕깁니다 */
    if (fishingFishY < 0)                          { fishingFishY = 0;                          fishingFishSpeed *= -1; }
    if (fishingFishY > WATER_HEIGHT - FISH_HEIGHT) { fishingFishY = WATER_HEIGHT - FISH_HEIGHT; fishingFishSpeed *= -1; }

    /* ── 2. 포획 영역 물리 이동 ── */
    /* 버튼을 누르면 위로(+), 떼면 아래로(-) 가속합니다 */
    if (isPressingFishingBtn) fishingPlayerVelocity += 1.5;
    else                      fishingPlayerVelocity -= 1.5;

    fishingPlayerVelocity *= 0.8; // 공기 저항(감속)
    fishingPlayerY        += fishingPlayerVelocity;

    /* 포획 영역이 위/아래 경계를 벗어나지 않도록 막습니다 */
    if (fishingPlayerY < 0)                           { fishingPlayerY = 0;                           fishingPlayerVelocity = 0; }
    if (fishingPlayerY > WATER_HEIGHT - PLAYER_HEIGHT) { fishingPlayerY = WATER_HEIGHT - PLAYER_HEIGHT; fishingPlayerVelocity = 0; }

    /* ── 3. 충돌 판정 ── */
    /* 물고기의 중심이 포획 영역 안에 들어와 있으면 성공 판정 */
    var fishCenterY  = fishingFishY + (FISH_HEIGHT / 2);
    var isOverlapping = (fishCenterY >= fishingPlayerY) && (fishCenterY <= fishingPlayerY + PLAYER_HEIGHT);

    if (isOverlapping) {
        fishingProgress += 0.4;  /* ★ 증가 속도 조정 가능 (값이 클수록 빨리 채워짐) */
        playerBar.className = 'catch-success'; // 초록색 테두리
    } else {
        fishingProgress -= 0.2;  /* ★ 감소 속도 조정 가능 (값이 클수록 빨리 줄어듦) */
        playerBar.className = 'catch-fail';    // 빨간색 테두리
    }

    fishingProgress = Math.max(0, Math.min(100, fishingProgress)); // 0~100 범위 제한

    /* ── 4. 화면 업데이트 ── */
    fishZone.style.bottom    = fishingFishY    + 'px';
    playerBar.style.bottom   = fishingPlayerY  + 'px';
    progressBar.style.width  = fishingProgress + '%';

    /* ── 5. 승패 판정 ── */
    if      (fishingProgress >= 100) { endFishingGame(true,  myCharId); }
    else if (fishingProgress <= 0)   { endFishingGame(false, myCharId); }
    else {
        /* 아직 진행 중이면 다음 프레임에 다시 실행 (약 60fps) */
        fishingAnimationFrame = requestAnimationFrame(function () {
            updateFishingGame(myCharId);
        });
    }
}

/*
게임 종료 처리 및 보상 지급

isWin    : true = 성공, false = 실패
myCharId : 보상을 지급할 캐릭터 ID

★ 보상 금액 변경 방법:
  difficulty === 'easy' 일 때  : minReward ~ maxReward G 사이 랜덤 지급
  difficulty === 'hard' 일 때  : minReward ~ maxReward G 사이 랜덤 지급
  아래 숫자를 원하는 값으로 바꾸세요.
*/
async function endFishingGame(isWin, myCharId) {
    fishingActive = false;

    var gameMessage = document.getElementById('fishing-message');
    var actionBtn   = document.getElementById('fishing-action-btn');
    var playerBar   = document.getElementById('player-bar');

    playerBar.className = ''; // 테두리 색 초기화
    actionBtn.disabled  = true;

    if (isWin) {
        /* ★ 난이도별 보상 범위 (G) */
        var minReward = currentDifficulty === 'easy' ? 100 : 300;
        var maxReward = currentDifficulty === 'easy' ? 500 : 1000;
        var reward    = Math.floor(Math.random() * (maxReward - minReward + 1)) + minReward;

        gameMessage.innerHTML   = '<b>월척입니다!</b><br>' + reward.toLocaleString() + ' G 획득!';
        gameMessage.style.color = '#4CAF50';
        actionBtn.innerText     = '보상 획득 중…';

        currentEditingId    = myCharId;
        currentEditingPhase = 0;
        var res = await upsertProfileData({ money: currentMoney + reward });

        if (!res || !res.error) {
            currentMoney += reward;
            await _refreshMiniGameMoneyDisplay();
            if (typeof loadCharacterData === 'function') await loadCharacterData();
        }
    } else {
        gameMessage.innerHTML   = '물고기가 도망갔습니다...';
        gameMessage.style.color = '#ff4d4d';
    }

    /* 2초 후 낚시터 선택 메뉴로 돌아갑니다 */
    setTimeout(function () {
        document.getElementById('fishing-play').style.display = 'none';
        document.getElementById('fishing-menu').style.display = 'flex';
        gameMessage.innerHTML   = '원하는 낚시터를 선택하세요.';
        gameMessage.style.color = '#fff';
    }, 2000);
}
