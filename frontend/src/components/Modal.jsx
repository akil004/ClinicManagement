import React from 'react';

const Modal = ({ title, onClose, children, wide = false }) => (
  <div className="modal-backdrop-custom" onClick={onClose}>
    <div className="modal-custom" style={{ maxWidth: wide ? 680 : 500 }} onClick={(e) => e.stopPropagation()}>
      <div className="modal-custom-header">
        <h5 className="modal-custom-title">{title}</h5>
        <button className="modal-close-btn" onClick={onClose}><i className="bi bi-x-lg" /></button>
      </div>
      {children}
    </div>
  </div>
);

export default Modal;
