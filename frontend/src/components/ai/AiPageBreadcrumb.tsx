const AiPageBreadcrumb = ({ pageTitle }: { pageTitle: string }) => {
  return (
    <div className="mb-6">
      <h2 className="text-xl font-semibold text-gray-800 dark:text-white/90">
        {pageTitle}
      </h2>
    </div>
  );
};

export default AiPageBreadcrumb;
