'use client';

interface DocReferences {
    source: string;
    page: string;
    page_content: string;
}


const DocumentReferences = ({ references }: { references: DocReferences[]}) => {
    return (
      <div className="p-6 bg-gray-50 hidden">
        {references.map((ref, index) => (
          <div
            key={index}
            className="bg-gray-800 text-white font-mono p-4 mb-4 rounded-md"
          >
            <pre className="whitespace-pre-wrap break-words">
              <code>
                <strong>Source:</strong> {ref.source}{"\n"}
                <strong>Page:</strong> {ref.page}{"\n"}
              </code>
            </pre>
          </div>
        ))}
      </div>
    );
  };
  
  export default DocumentReferences;