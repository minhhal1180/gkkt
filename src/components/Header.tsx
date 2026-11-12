interface HeaderProps {
  onNavigateDataSource: () => void;
}

export function Header({ onNavigateDataSource }: HeaderProps) {
  return (
    <header className="site-header">
      <a href="#top" className="brand-name" id="top">
        Gửi Về
      </a>
      <nav aria-label="Điều hướng chính">
        <a
          href="#nguon-du-lieu"
          className="header-nav-link"
          onClick={(event) => {
            event.preventDefault();
            onNavigateDataSource();
          }}
        >
          Dữ liệu
        </a>
      </nav>
    </header>
  );
}
