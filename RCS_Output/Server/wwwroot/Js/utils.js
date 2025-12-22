import { state } from './config.js';

// --- UI HELPERS ---

export function updateStatus(msg, type) {
    const el = document.getElementById('status-display');
    const dot = document.getElementById('status-dot');
    if (!el || !dot) return;

    el.textContent = msg;
    if (type === 'success') {
        el.className = "text-xs font-semibold text-green-600 uppercase tracking-wide";
        dot.className = "w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse";
    } else if (type === 'error') {
        el.className = "text-xs font-semibold text-red-600 uppercase tracking-wide";
        dot.className = "w-2.5 h-2.5 rounded-full bg-red-500";
    } else {
        el.className = "text-xs font-semibold text-yellow-600 uppercase tracking-wide";
        dot.className = "w-2.5 h-2.5 rounded-full bg-yellow-500 animate-ping";
    }
}

export function showModal(title, msg, confirmFn, isInfo = false) {
    const c = document.getElementById('modal-container');
    c.querySelector('#modal-title').textContent = title;
    c.querySelector('#modal-message').textContent = msg;
    
    const confirmBtn = c.querySelector('#modal-confirm-btn');
    const cancelBtn = c.querySelector('#modal-cancel-btn');

    // Reset button để xóa event listener cũ
    const newConfirm = confirmBtn.cloneNode(true);
    confirmBtn.parentNode.replaceChild(newConfirm, confirmBtn);
    
    const newCancel = cancelBtn.cloneNode(true);
    cancelBtn.parentNode.replaceChild(newCancel, cancelBtn);

    if (isInfo) {
        newConfirm.textContent = 'Đóng';
        newConfirm.className = 'px-5 py-2.5 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition-colors';
        newCancel.classList.add('hidden');
    } else {
        newConfirm.textContent = 'Xác Nhận';
        newConfirm.className = 'px-5 py-2.5 bg-red-600 text-white font-medium rounded-xl hover:bg-red-700 shadow-lg shadow-red-200 transition-all';
        newCancel.classList.remove('hidden');
    }

    newConfirm.onclick = () => { c.classList.add('hidden'); if (confirmFn) confirmFn(); };
    newCancel.onclick = () => c.classList.add('hidden');
    
    c.classList.remove('hidden');
}

export function getSortIcon(column, currentSortState) {
    const active = currentSortState.column === column;
    const iconName = active 
        ? (currentSortState.direction === 'asc' ? 'fa-caret-down' : 'fa-caret-up')
        : 'fa-caret-right';
    
    const styleClass = active 
        ? 'text-blue-600 dark:text-blue-400 bg-blue-50 border-blue-200 shadow-sm ring-1 ring-blue-200' 
        : 'text-gray-400 bg-gray-50 border-gray-200 hover:bg-gray-100 hover:text-gray-600';

    return `<span class="sort-btn ml-2 w-5 h-5 inline-flex items-center justify-center rounded-md border ${styleClass} transition-all cursor-pointer" title="Sắp xếp">
        <i class="fas ${iconName} text-xs"></i>
    </span>`;
}

export function getLoadingRow(colspan) {
    return `<tr><td colspan="${colspan}" class="px-6 py-8 text-center"><div class="loader mb-2"></div><span class="text-gray-500 text-sm">Đang tải dữ liệu từ Agent...</span></td></tr>`;
}

export function getEmptyRow(colspan) {
    return `<tr><td colspan="${colspan}" class="px-6 py-8 text-center text-gray-500 italic">Không có dữ liệu nào được tìm thấy.</td></tr>`;
}

// =========================================================
// BỘ XỬ LÝ TELEX & KÝ TỰ (Advanced Text Processor)
// =========================================================

let isShiftPending = false;

// Bảng dịch mã phím C# (.NET Keys Enum) sang ký tự thực tế
const KEY_MAPPING = {
    // Hàng phím số (nếu Agent gửi D0-D9)
    'D0': '0', 'D1': '1', 'D2': '2', 'D3': '3', 'D4': '4',
    'D5': '5', 'D6': '6', 'D7': '7', 'D8': '8', 'D9': '9',

    // Các phím dấu câu cơ bản
    'Oemcomma': ',', 
    'OemPeriod': '.', 
    'OemQuestion': '/', 
    'OemMinus': '-', 
    'Oemplus': '=',
    'Oem1': ';',      // Dấu chấm phẩy
    'Oem7': "'",      // Dấu nháy đơn
    'OemOpenBrackets': '[', 
    'Oem6': ']', 
    'Oem5': '\\',     // Dấu gạch chéo ngược
    'Oem3': '`',      // Dấu huyền (cạnh số 1)
    
    // NumPad (Bàn phím số bên phải)
    'NumPad0': '0', 'NumPad1': '1', 'NumPad2': '2', 'NumPad3': '3', 'NumPad4': '4',
    'NumPad5': '5', 'NumPad6': '6', 'NumPad7': '7', 'NumPad8': '8', 'NumPad9': '9',
    'Decimal': '.', 'Add': '+', 'Subtract': '-', 'Multiply': '*', 'Divide': '/',
    'OemPipe': '\\', 'Oem4': '[', 'OemSemicolon': ';', 'Oem2': '/', 'Enter': '\n'
};

// Bảng Map ký tự khi giữ Shift (Shift + Key = NewKey)
const SHIFT_SYMBOL_MAP = {
    '1': '!', '2': '@', '3': '#', '4': '$', '5': '%', '6': '^', '7': '&', '8': '*', '9': '(', '0': ')',
    '`': '~',
    '-': '_', '=': '+',
    '[': '{', ']': '}', '\\': '|',
    ';': ':', "'": '"',
    ',': '<', '.': '>', '/': '?'
};

// Bảng Telex và Dấu thanh (Giữ nguyên)
const TELEX_MAP = {
    'aa': 'â', 'aw': 'ă', 'ee': 'ê', 'oo': 'ô', 'ow': 'ơ', 'dd': 'đ', 'uw': 'ư',
    's': '\u0301', 'f': '\u0300', 'r': '\u0309', 'x': '\u0303', 'j': '\u0323'
};
const TONE_MAP = { 's': 0, 'f': 1, 'r': 2, 'x': 3, 'j': 4 };
const VOWELS = {
    'a': 'áàảãạ', 'ă': 'ắằẳẵặ', 'â': 'ấầẩẫậ', 'e': 'éèẻẽẹ', 'ê': 'ếềểễệ',
    'i': 'íìỉĩị', 'o': 'óòỏõọ', 'ô': 'ốồổỗộ', 'ơ': 'ớờởỡợ', 'u': 'úùủũụ', 'ư': 'ứừửữự', 'y': 'ýỳỷỹỵ'
};

function addTone(char, toneIndex) {
    const base = Object.keys(VOWELS).find(k => VOWELS[k].includes(char) || k === char);
    if (!base) return char;
    return VOWELS[base][toneIndex];
}

export function processInputKey(currentText, rawKey, mode) {
    // Bước 1: Làm sạch mã phím (Xóa ngoặc vuông nếu có)
    // Ví dụ: "[OemComma]" -> "OemComma"
    let cleanKey = rawKey;
    if (rawKey.startsWith('[') && rawKey.endsWith(']')) {
        cleanKey = rawKey.slice(1, -1);
    }

    // --- XỬ LÝ SHIFT ---
    // Nếu nhận được phím Shift, bật cờ và không in gì cả
    if (cleanKey === 'SHIFT' || cleanKey === 'Shift' || cleanKey === 'LShiftKey' || cleanKey === 'RShiftKey') {
        isShiftPending = true;
        return currentText;
    }

    // Bước 2: Kiểm tra xem có trong bảng Mapping không
    // Nếu có (ví dụ OemComma), đổi thành ","
    if (KEY_MAPPING[cleanKey]) {
        cleanKey = KEY_MAPPING[cleanKey];
    } 
    // Nếu không có trong map nhưng vẫn còn ngoặc vuông (ví dụ [CTRL], [SHIFT])
    // -> Đây là phím chức năng thật, bỏ qua không in.
    else if (rawKey.startsWith('[') && rawKey.endsWith(']')) {
        // Xử lý đặc biệt cho các phím chức năng muốn giữ lại hành vi
        if (cleanKey === 'Space' || cleanKey === 'SPACE') return currentText + ' ';
        if (cleanKey === 'Enter' || cleanKey === 'ENTER') return currentText + '\n';
        if (cleanKey === 'Tab' || cleanKey === 'TAB') return currentText + '\t';
        if (cleanKey === 'Back' || cleanKey === 'BACK') return currentText.slice(0, -1);
        
        // Các phím Shift, Ctrl, Alt... thì bỏ qua
        return currentText;
    }

    // --- ĐẾN ĐÂY LÀ CHẮC CHẮN KÝ TỰ IN ĐƯỢC (Chữ, Số, Dấu) ---

    // --- ÁP DỤNG SHIFT NẾU CÓ ---
    if (isShiftPending) {
        // Nếu là ký tự đặc biệt (số, dấu) -> Map sang ký tự Shift tương ứng
        if (SHIFT_SYMBOL_MAP[cleanKey]) {
            cleanKey = SHIFT_SYMBOL_MAP[cleanKey];
        } 
        // Nếu là chữ cái -> Viết hoa (Phòng hờ nếu C# gửi chữ thường)
        else if (cleanKey.length === 1) {
            cleanKey = cleanKey.toUpperCase();
        }
        
        // Tắt cờ Shift sau khi đã áp dụng cho 1 ký tự
        isShiftPending = false;
    }

    // Nếu không bật Telex -> Cộng thẳng vào
    if (mode !== 'telex') return currentText + cleanKey;

    // --- LOGIC TELEX ---
    if (currentText.length === 0) return currentText + cleanKey;
    
    const lastChar = currentText.slice(-1);
    const preText = currentText.slice(0, -1);
    const keyLower = cleanKey.toLowerCase();
    const pair = (lastChar + keyLower).toLowerCase();

    // Xử lý aa, ee, oo...
    if (TELEX_MAP[pair]) {
        let rep = TELEX_MAP[pair];
        if (lastChar === lastChar.toUpperCase()) rep = rep.toUpperCase();
        return preText + rep;
    }

    // Xử lý dấu thanh (s,f,r,x,j)
    if (TONE_MAP.hasOwnProperty(keyLower)) {
        // Tách từ cuối cùng ra để bỏ dấu
        // Regex tìm từ cuối cùng (các ký tự chữ cái)
        const match = currentText.match(/([a-zA-Z\u00C0-\u1EF9]+)$/);
        
        if (match) {
            let lastWord = match[0];
            let prefix = currentText.substring(0, match.index);
            
            // Quét ngược tìm nguyên âm để bỏ dấu
            for (let i = lastWord.length - 1; i >= 0; i--) {
                const char = lastWord[i].toLowerCase();
                // Tìm ký tự gốc (bỏ dấu cũ nếu có)
                const baseVowel = Object.keys(VOWELS).find(k => k === char || VOWELS[k].includes(char));
                
                if (baseVowel) {
                    let newChar = addTone(baseVowel, TONE_MAP[keyLower]);
                    if (lastWord[i] === lastWord[i].toUpperCase()) newChar = newChar.toUpperCase();
                    
                    const newWord = lastWord.substring(0, i) + newChar + lastWord.substring(i + 1);
                    return prefix + newWord;
                }
            }
        }
    }

    // Không phải quy tắc telex nào -> Cộng bình thường
    return currentText + cleanKey;
}



export const pad3 = (num) => num.toString().padStart(3, " ");



export function renderDiskInfo(rawString) {
    // 1. Parsing: Tách chuỗi thô thành các nhóm ổ đĩa
    // Regex giải thích: Tìm ký tự ổ đĩa (A-Z) theo sau là :\, bắt nhóm Free và Total
    const regex = /([A-Z]:\\)\s\[Free:\s(\d+)GB\s\/\s(\d+)GB\]/g;
    let match;
    let res = "";

    while ((match = regex.exec(rawString)) !== null) {
        // match[1]: Tên ổ (C:\)
        // match[2]: Free (61)
        // match[3]: Total (176)
        
        const driveName = match[1];
        const freeGB = parseInt(match[2]);
        const totalGB = parseInt(match[3]);
        
        // 2. Processing: Tính toán logic
        const usedGB = totalGB - freeGB;
        const usedPercent = Math.round((usedGB / totalGB) * 100);
        
        // Logic màu sắc: Đỏ nếu > 90%, Vàng > 70%, Xanh còn lại
        let colorClass = 'bg-emerald-500';
        if (usedPercent > 90) colorClass = 'bg-red-500';
        else if (usedPercent > 70) colorClass = 'bg-yellow-500';

        // 3. Rendering: Tạo HTML string (Tailwind)
        res += driveName + " " + pad3(freeGB) + "GB/" + pad3(totalGB) + "GB. " + " - " + usedPercent + "%\n";
    }
    return res;
}


export function handleChatMessage(sender, message, time) {
    console.log("Nhận tin nhắn:", sender, message);
    // Chỉ hiển thị nếu đang ở view automation (hoặc hiển thị thông báo popup nếu ở view khác)
    if (state.currentView === 'automation') {
        appendMessageToUI(sender, message, time, 'received');
    } else {
        // Tùy chọn: Hiện Toast thông báo có tin nhắn mới
        updateStatus(`Tin nhắn mới từ ${sender}`, 'success');
    }
}

export function appendMessageToUI(sender, message, time, type) {
    const chatBox = document.getElementById('chat-messages');
    if (!chatBox) return;

    const isMe = type === 'sent';
    
    // HTML cho tin nhắn (Bong bóng chat)
    const bubbleHtml = `
        <div class="flex ${isMe ? 'justify-end' : 'justify-start'} animate-fade-in-up">
            <div class="max-w-[70%] ${isMe ? 'bg-blue-600 text-white rounded-br-none' : 'bg-white border border-slate-200 text-slate-700 rounded-bl-none'} p-3 rounded-2xl shadow-sm relative group">
                <p class="text-sm leading-relaxed">${message}</p>
                <div class="text-[10px] ${isMe ? 'text-blue-200' : 'text-slate-400'} mt-1 text-right flex justify-end items-center gap-1">
                    ${!isMe ? `<span class="font-bold mr-1">${sender}</span>` : ''} 
                    ${time}
                    ${isMe ? '<i class="fas fa-check-double"></i>' : ''}
                </div>
            </div>
        </div>
    `;
    
    // Chèn vào cuối
    chatBox.insertAdjacentHTML('beforeend', bubbleHtml);
    // Cuộn xuống đáy
    chatBox.scrollTop = chatBox.scrollHeight;
}