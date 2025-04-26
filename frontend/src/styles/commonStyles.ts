import { TransitionProps } from '@mantine/core';

export const inputStyles = {
  input: {
    background: 'var(--surface-input)',
    border: '1px solid var(--primary-border)',
    padding: '10px 14px',
    borderRadius: '8px',
    fontSize: '15px',
    transition: 'var(--transition-standard)',
    '&:focus': {
      borderColor: 'rgba(155, 163, 255, 0.6)',
      boxShadow: '0 0 0 2px rgba(155, 163, 255, 0.2)'
    }
  }
};

export const dropdownStyles = {
  input: inputStyles.input,
  dropdown: {
    background: 'rgba(35, 37, 65, 0.95)',
    backdropFilter: 'blur(8px)',
    border: '1px solid var(--primary-border)',
    boxShadow: 'var(--shadow-md)'
  }
};

export const modalOverlayProps = {
  blur: 5,
  opacity: 0.7,
  color: "#121215"
};

export const modalTransitionProps = {
  transition: 'slide-up',
  duration: 180
} as TransitionProps;

export const gradientButtonStyles = {
  root: {
    padding: '8px 24px',
    fontWeight: 600,
    letterSpacing: '0.3px',
    boxShadow: '0 4px 12px rgba(122, 132, 255, 0.3)'
  }
};

export const modalStyles = {
  header: {
    backgroundColor: "rgba(30, 32, 58, 0.7)",
    borderBottom: "1px solid var(--primary-border)"
  },
  content: {
    backgroundColor: "rgba(26, 27, 46, 0.8)",
    backdropFilter: "blur(12px)"
  }
}

export const modalOverlayOptions = {
  blur: 3,
  opacity: 0.55
}

export const checkboxStyles = {
  label: { 
      color: '#f1f1f7',
      fontSize: '0.95rem'
  },
  input: {
      cursor: 'pointer',
      '&:checked': {
          backgroundColor: 'rgba(155, 163, 255, 0.8)',
          borderColor: 'rgba(155, 163, 255, 0.8)'
      }
  }
}

export const buttonStyle = {
    transition: 'all 0.3s cubic-bezier(0.22, 1, 0.36, 1)',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
    border: '1px solid rgba(255, 255, 255, 0.05)'
};