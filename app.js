// Google Apps Script (GAS) の Web API URL
const GAS_URL = 'https://script.google.com/macros/s/AKfycbykLvkzKtIL3Go8mtRP95VIRssFgnxxQ05Pk0tTJXRnHe--2t3ECLUYKxAXTVb-27tD/exec';

document.addEventListener('DOMContentLoaded', () => {
    const btnIn = document.getElementById('btn-in');
    const btnOut = document.getElementById('btn-out');
    const statusMessage = document.getElementById('status-message');

    // UI elements for confirmation
    const actionButtons = document.getElementById('action-buttons');
    const confirmSection = document.getElementById('confirm-section');
    const confirmText = document.getElementById('confirm-text');
    const datetimeInput = document.getElementById('datetime-input');
    const btnConfirm = document.getElementById('btn-confirm');
    const btnCancel = document.getElementById('btn-cancel');
    const userTabs = document.getElementById('user-tabs');

    let pendingStatus = '';

    // 出勤ボタン
    btnIn.addEventListener('click', () => {
        showConfirmSection('出勤');
    });

    // 退勤ボタン
    btnOut.addEventListener('click', () => {
        showConfirmSection('退勤');
    });

    // キャンセルボタン
    btnCancel.addEventListener('click', () => {
        hideConfirmSection();
    });

    // 決定ボタン
    btnConfirm.addEventListener('click', () => {
        sendData(pendingStatus, datetimeInput.value);
    });

    function showConfirmSection(status) {
        pendingStatus = status;

        // 選択されているユーザー名を取得
        const selectedRadio = document.querySelector('input[name="user"]:checked');
        const userLabel = selectedRadio ? document.querySelector(`label[for="${selectedRadio.id}"]`).textContent : '未選択';

        // 確認メッセージを設定
        confirmText.textContent = `${userLabel}さんの「${status}」この時間でよろしいですか？`;

        // 現在の日時を取得してinputに設定 (ローカルタイムゾーン)
        const now = new Date();
        now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
        datetimeInput.value = now.toISOString().slice(0, 16); // YYYY-MM-DDTHH:mm

        // UIの切り替え
        actionButtons.classList.add('hidden');
        userTabs.classList.add('hidden'); // タブも隠す
        confirmSection.classList.remove('hidden');
        statusMessage.textContent = '';
    }

    function hideConfirmSection() {
        confirmSection.classList.add('hidden');
        actionButtons.classList.remove('hidden');
        userTabs.classList.remove('hidden');
    }

    async function sendData(status, datetimeString) {
        const selectedRadio = document.querySelector('input[name="user"]:checked');
        const userLabel = selectedRadio ? document.querySelector(`label[for="${selectedRadio.id}"]`).textContent : '未選択';

        // 表示用に日時をフォーマット (YYYY-MM-DDTHH:mm -> YYYY/MM/DD HH:mm)
        const formattedDate = datetimeString.replace('T', ' ').replace(/-/g, '/');

        // UIフィードバック
        hideConfirmSection();
        statusMessage.textContent = `${userLabel}の${status}を記録中...`;
        statusMessage.style.color = '#fff';
        btnIn.disabled = true;
        btnOut.disabled = true;

        // 送信データ作成 (GAS用)
        const formData = new URLSearchParams();
        formData.append('name', userLabel);
        formData.append('status', status);
        formData.append('datetime', datetimeString); // ユーザーが指定した日時(YYYY-MM-DDTHH:mm形式)を送る

        try {
            // mode: 'no-cors' はGASだとエラー原因になることがあるため、通常のPOSTとして送信し、結果を受け取る
            const response = await fetch(GAS_URL, {
                method: 'POST',
                // Chrome等のCORS制約を回避するため、コンテンツタイプを明示的に指定
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: formData
            });

            // GASからの返答を待つ
            const result = await response.json();

            if (result.status === 'success') {
                statusMessage.textContent = `✅ ${userLabel}の${status}を記録しました！\n（打刻時間：${formattedDate}）`;
            } else {
                throw new Error(result.message || 'サーバーエラー');
            }

        } catch (error) {
            console.error('Error:', error);
            // CORSエラーやネットワークエラーの場合は、一応送信はできている可能性もあるためメッセージを工夫
            statusMessage.textContent = '❌ 送信に失敗したか、確認できませんでした。シートを確認してください。';
        } finally {
            setTimeout(() => {
                statusMessage.textContent = '';
                btnIn.disabled = false;
                btnOut.disabled = false;
            }, 5000);
        }
    }
});
