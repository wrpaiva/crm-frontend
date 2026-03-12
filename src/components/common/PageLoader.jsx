function PageLoader({ text = 'Carregando...' }) {
  return (
    <div className="page-loader">
      <div className="page-loader-spinner" />
      <p>{text}</p>
    </div>
  );
}

export default PageLoader;