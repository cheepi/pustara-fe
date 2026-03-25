export default function Wordmark({ isLight, className }: { isLight?: boolean, className?: string }) {
    const fill = isLight ? '#3B2F1A' : '#F5E9D3';
    return (
        <svg className={className} width="107" height="23" viewBox="0 0 107 23" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M0 0H107V23H0V0Z" fill={fill} />
        </svg>
    );
}