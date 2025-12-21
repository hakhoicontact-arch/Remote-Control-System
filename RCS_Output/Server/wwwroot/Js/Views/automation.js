export function renderAutomationLayout() {
    return `
        <div class="h-full flex gap-6">
            ${renderMacroSidebar()}
            ${renderAgentChatBox()}
        </div>
    `;
}

export function renderMacroSidebar() {
    return `
        <div class="w-1/3 flex flex-col gap-4">
            <div class="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
                <h3 class="font-bold text-slate-700 uppercase tracking-wider border-b border-slate-100 pb-2 mb-4">
                    <i class="fas fa-magic mr-2 text-orange-500"></i> Quick Actions
                </h3>
                <div class="space-y-3">
                    <button id="macro-panic" class="w-full flex items-center p-3 rounded-xl bg-red-50 text-red-700 hover:bg-red-100 transition-colors text-left text-sm font-medium">
                        <i class="fas fa-biohazard text-xl mr-3"></i> Panic Mode
                    </button>
                    <button id="macro-work" class="w-full flex items-center p-3 rounded-xl bg-green-50 text-green-700 hover:bg-green-100 transition-colors text-left text-sm font-medium">
                        <i class="fas fa-briefcase text-xl mr-3"></i> Open Workspace
                    </button>
                </div>
            </div>
            
            <div class="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex-1">
                <h3 class="font-bold text-slate-700 uppercase tracking-wider border-b border-slate-100 pb-2 mb-4">
                    <i class="fas fa-volume-up mr-2 text-purple-500"></i> Text-to-Speech
                </h3>
                <div class="flex gap-2">
                    <input id="tts-input" type="text" class="flex-1 p-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-purple-500" placeholder="Nhập nội dung...">
                    <button id="send-tts-btn" class="bg-purple-600 text-white px-3 py-2 rounded-lg hover:bg-purple-700 transition-colors">
                        <i class="fas fa-play"></i>
                    </button>
                </div>
            </div>
        </div>
    `;
}

export function renderAgentChatBox() {
    return `
        <div class="flex-1 bg-white rounded-2xl shadow-md border border-slate-200 flex flex-col overflow-hidden">
            <div class="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">AG</div>
                    <div>
                        <h3 class="font-bold text-slate-800 text-sm">Agent Chat</h3>
                        <p class="text-xs text-green-600 flex items-center"><span class="w-1.5 h-1.5 bg-green-500 rounded-full mr-1"></span> Online</p>
                    </div>
                </div>
                <button id="clear-chat-btn" class="text-slate-400 hover:text-red-500 transition-colors" title="Xóa lịch sử">
                    <i class="fas fa-trash-alt"></i>
                </button>
            </div>

            <div id="chat-messages" class="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50 scroll-smooth">
                <div class="flex justify-center">
                    <span class="text-[10px] text-slate-400 bg-slate-100 px-2 py-1 rounded-full">Bắt đầu phiên chat</span>
                </div>
            </div>

            <div class="p-4 bg-white border-t border-slate-200">
                <div class="flex gap-2 relative">
                    <input id="chat-input" type="text" class="flex-1 pl-4 pr-12 py-3 bg-slate-100 border-none rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm transition-all" placeholder="Nhập tin nhắn gửi đến Agent...">
                    <button id="send-chat-btn" class="absolute right-2 top-2 bg-blue-600 text-white w-8 h-8 rounded-lg hover:bg-blue-700 transition-transform active:scale-95 flex items-center justify-center shadow-md shadow-blue-200">
                        <i class="fas fa-paper-plane text-xs"></i>
                    </button>
                </div>
            </div>
        </div>
    `;
}