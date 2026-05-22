type Props = {
    children: React.ReactNode;
  };
  
  export default function TaskTable({ children }: Props) {
    return (
      <div style={{ overflowX: "auto", width: "100%" }}>
        {children}
      </div>
    );
  }