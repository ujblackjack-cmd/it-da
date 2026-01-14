// src/components/chat/BillInputModal.tsx
import {useState} from "react";

interface BillInputModalProps {
    onClose: () => void;
    onSubmit: (data: { totalAmount: number; account: string }) => void;
}

const BillInputModal = ({ onClose, onSubmit }: BillInputModalProps) => {
    const [amount, setAmount] = useState<string>("");
    const [account, setAccount] = useState<string>("");

    const handleConfirm = () => {
        if (!amount || !account) {
            alert("금액과 계좌 정보를 모두 입력해주세요.");
            return;
        }
        // ✅ 입력받은 문자열 금액을 숫자형으로 변환하여 전송
        onSubmit({
            totalAmount: Number(amount),
            account
        });
    };

    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <h3>💰 정산 요청하기</h3>
                <input
                    type="number"
                    placeholder="총 금액을 입력하세요"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                />
                <input
                    type="text"
                    placeholder="계좌번호 (예: 신한 110...)"
                    value={account}
                    onChange={(e) => setAccount(e.target.value)}
                />
                <div className="modal-btns">
                    <button onClick={onClose}>취소</button>
                    <button onClick={handleConfirm}className="submit-btn" disabled={!amount || !account}>전송</button>
                </div>
            </div>
        </div>
    );
};

export default BillInputModal;