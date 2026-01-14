// src/components/chat/PollInputModal.tsx
import {useState} from "react";

interface PollInputModalProps {
    onClose: () => void;
    onSubmit: (data: { title: string; options: string[] }) => void;
}

const PollInputModal = ({ onClose, onSubmit }: PollInputModalProps) => {
    const [title, setTitle] = useState("");
    const [options, setOptions] = useState(["", ""]);

    const addOption = () => setOptions([...options, ""]);

    const handleConfirm = () => {
        if (!title.trim()) {
            alert("투표 제목을 입력해주세요.");
            return;
        }

        // ✅ 빈 문자열인 선택지는 제외하고 전송
        const filteredOptions = options.filter(opt => opt.trim() !== "");

        if (filteredOptions.length < 2) {
            alert("최소 2개 이상의 선택지를 입력해주세요.");
            return;
        }

        onSubmit({ title, options: filteredOptions });
    };
    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <h3>📊 투표 생성하기</h3>
                <input
                    type="text"
                    placeholder="투표 제목을 입력하세요"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                />
                {options.map((opt, i) => (
                    <input
                        key={i}
                        placeholder={`선택지 ${i + 1}`}
                        value={opt}
                        onChange={(e) => {
                            const newOpts = [...options];
                            newOpts[i] = e.target.value;
                            setOptions(newOpts);
                        }}
                    />
                ))}
                <button onClick={addOption} className="add-opt-btn">+ 선택지 추가</button>
                <div className="modal-btns">
                    <button onClick={onClose}>취소</button>
                    <button
                        onClick={handleConfirm}
                        className="submit-btn"
                        disabled={!title.trim()}
                    >생성</button>
                </div>
            </div>
        </div>
    );
};

export default PollInputModal;